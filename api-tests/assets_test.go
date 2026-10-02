package apitests

import (
	"bytes"
	"encoding/base64"
	"net/http"
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

// 1x1 transparent PNG
var tinyPNG, _ = base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")

// TestUploadThroughPresignedURL talks to the real bucket. It uploads one tiny
// object and deletes it again through the API.
func TestUploadThroughPresignedURL(t *testing.T) {
	h := New(t)
	if !h.Env.S3Upload {
		t.Skip("API_S3_UPLOAD not set")
	}
	owner := h.NewUser()
	g := h.NewGroup(owner, "Upload", "a")
	profile := g.Profiles["a"]

	upload := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + profile + "/avatar"), Auth: owner.Bearer(), Skip: true}))
	put, _ := http.NewRequest("PUT", upload.Str("singleUploadUrl"), bytes.NewReader(tinyPNG))
	put.Header.Set("Content-Type", "image/png")
	res, err := http.DefaultClient.Do(put)
	h.True(err == nil && res.StatusCode == 200, "upload through presigned url: %v %v", err, res)

	// the presigned URL is bound to the content type it was signed for
	wrong, _ := http.NewRequest("PUT", upload.Str("singleUploadUrl"), bytes.NewReader(tinyPNG))
	wrong.Header.Set("Content-Type", "image/jpeg")
	res, err = http.DefaultClient.Do(wrong)
	h.True(err == nil && res.StatusCode == 403, "upload with another content type is rejected: %v %v", err, res)

	h.OK(h.Do(Req{Method: "DELETE", Path: g.Path("/profiles/" + profile + "/avatar"), Auth: owner.Bearer(), Skip: true}))
	head, err := http.Head(upload.Str("url"))
	h.True(err == nil && head.StatusCode != 200, "object is gone after deleting the avatar: %v %v", err, head)
}

func TestAssetMetadata(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Asset", "a")
	set := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + g.Profiles["a"] + "/avatar"), Auth: owner.Bearer(), Body: map[string]any{"offsetX": 0.5, "offsetY": 0.25, "zoom": 3}}))
	asset := h.OK(h.Do(Req{Method: "GET", Path: "/assets/" + set.Str("id")}))
	h.Equal(asset.Str("url"), set.Str("url"), "public url")
	h.Equal(asset.Data("singleUploadUrl"), nil, "metadata has no upload url")
	h.Equal(asset.Num("offsetX"), 0.5, "offsetX")
}
