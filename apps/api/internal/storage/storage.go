// Package storage talks to the S3-compatible bucket that holds avatars,
// wallpapers, match photos and camera recordings. The app uploads through presigned
// URLs (camera footage streams through the web server to avoid browser CORS);
// the API only signs uploads and deletes objects.
package storage

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
	"github.com/aws/smithy-go/middleware"
	smithyhttp "github.com/aws/smithy-go/transport/http"

	"github.com/laurin-notemann/beerpong/api-go/internal/config"
)

const uploadURLTTL = 5 * time.Minute

type Bucket struct {
	client   *s3.Client
	presign  *s3.PresignClient
	bucket   string
	endpoint string
}

func New(cfg config.AWS) *Bucket {
	client := s3.New(s3.Options{
		Region:       cfg.Region,
		BaseEndpoint: aws.String("https://" + cfg.Endpoint),
		Credentials:  credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
		// Hetzner's object storage does not support the SDK's default
		// CRC checksums, and they would end up in presigned URLs.
		RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired,
		ResponseChecksumValidation: aws.ResponseChecksumValidationWhenRequired,
	})
	presign := s3.NewPresignClient(client, s3.WithPresignClientFromClientOptions(s3.WithAPIOptions(withoutXID)))
	return &Bucket{client: client, presign: presign, bucket: cfg.Bucket, endpoint: cfg.Endpoint}
}

// withoutXID drops the SDK's "x-id=PutObject" query parameter so presigned
// URLs look exactly like the ones the Java SDK produced.
func withoutXID(stack *middleware.Stack) error {
	return stack.Build.Add(middleware.BuildMiddlewareFunc("RemoveXID", func(ctx context.Context, in middleware.BuildInput, next middleware.BuildHandler) (middleware.BuildOutput, middleware.Metadata, error) {
		if req, ok := in.Request.(*smithyhttp.Request); ok {
			q := req.URL.Query()
			q.Del("x-id")
			req.URL.RawQuery = q.Encode()
		}
		return next.HandleBuild(ctx, in)
	}), middleware.After)
}

// PublicURL is where the app loads an asset from.
func (b *Bucket) PublicURL(key string) string {
	return "https://" + b.bucket + "." + b.endpoint + "/" + key
}

// UploadURL presigns a PUT for key. The content type is left out of the
// signature: the picker hands the app JPEG, PNG or HEIC, and the object
// keeps whatever Content-Type the upload carries.
func (b *Bucket) UploadURL(ctx context.Context, key string) (string, error) {
	req, err := b.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(b.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(uploadURLTTL))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

// Delete removes key if it was ever uploaded. Assets whose upload never
// happened only exist in the database.
func (b *Bucket) Delete(ctx context.Context, key string) error {
	_, err := b.client.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(b.bucket), Key: aws.String(key)})
	if err != nil {
		if isNotFound(err) {
			return nil
		}
		return err
	}
	_, err = b.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(b.bucket), Key: aws.String(key)})
	return err
}

func isNotFound(err error) bool {
	var apiErr smithy.APIError
	if errors.As(err, &apiErr) && (apiErr.ErrorCode() == "NotFound" || apiErr.ErrorCode() == "NoSuchKey") {
		return true
	}
	var respErr interface{ HTTPStatusCode() int }
	return errors.As(err, &respErr) && respErr.HTTPStatusCode() == http.StatusNotFound
}
