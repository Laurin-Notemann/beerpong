package api

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
)

// crop is the optional AssetCropDto sent when setting an image.
type crop struct{ offsetX, offsetY, zoom float64 }

func (c crop) valid() bool { return c.offsetX >= 0 && c.offsetY >= 0 && c.zoom >= 0 }

// readCrop reads the optional crop body (missing body means no crop).
func readCrop(r *request) (crop, response) {
	body, res := readJSON(r.Request, false)
	if res != nil || body == nil {
		return crop{}, res
	}
	o, err := asObject(body)
	if err != nil {
		return crop{}, springError(400)
	}
	x, err1 := o.primitiveFloat("offsetX")
	y, err2 := o.primitiveFloat("offsetY")
	z, err3 := o.primitiveFloat("zoom")
	if err1 != nil || err2 != nil || err3 != nil {
		return crop{}, springError(400)
	}
	return crop{x, y, z}, nil
}

func insertAsset(ctx context.Context, q *db.Queries, typ int16, c crop) (db.Asset, error) {
	return q.InsertAsset(ctx, db.InsertAssetParams{ID: uuid.NewString(), Offsetx: c.offsetX, Offsety: c.offsetY, Type: &typ, Zoom: c.zoom})
}

// deleteAsset removes the object from the bucket and the row. Callers have
// already dropped every reference to it.
func (s *Server) deleteAsset(ctx context.Context, q *db.Queries, id string) error {
	if err := s.bucket.Delete(ctx, id); err != nil {
		return err
	}
	return q.DeleteAsset(ctx, id)
}

func (s *Server) assetMetadata(a db.Asset) assetMetadataDTO {
	return assetMetadataDTO{
		ID:      a.ID,
		URL:     s.bucket.PublicURL(a.ID),
		Type:    enumName(assetTypes, a.Type),
		OffsetX: a.Offsetx,
		OffsetY: a.Offsety,
		Zoom:    a.Zoom,
	}
}

// assetUpload signs an upload for a freshly created asset. The signed
// content type is the request's when it is an image type, else image/png.
func (s *Server) assetUpload(r *request, a db.Asset) (assetUploadDTO, error) {
	contentType := "image/png"
	if ct := r.Header.Get("Content-Type"); strings.HasPrefix(strings.ToLower(ct), "image/") {
		contentType = ct
	}
	url, err := s.bucket.UploadURL(r.Context(), a.ID, contentType)
	if err != nil {
		return assetUploadDTO{}, err
	}
	return assetUploadDTO{assetMetadataDTO: s.assetMetadata(a), SingleUploadURL: url}, nil
}
