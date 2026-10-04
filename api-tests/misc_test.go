package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestHealthcheck(t *testing.T) {
	h := New(t)
	res := h.OK(h.Do(Req{Method: "GET", Path: "/healthcheck"}))
	h.Equal(res.Data(), "OK", "healthcheck data")
}

// Spring Security put these on every response; no-store keeps the phones'
// HTTP stacks from caching API responses.
func TestResponseHeaders(t *testing.T) {
	h := New(t)
	want := map[string]string{
		"Cache-Control":          "no-cache, no-store, max-age=0, must-revalidate",
		"Pragma":                 "no-cache",
		"Expires":                "0",
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"X-Xss-Protection":       "0",
	}
	for _, res := range []*Resp{
		h.Do(Req{Method: "GET", Path: "/healthcheck", Skip: true}),
		h.Do(Req{Method: "GET", Path: "/nope", Skip: true}),
		h.Do(Req{Method: "GET", Path: "/groups/user", Skip: true}),
	} {
		for name, value := range want {
			h.Equal(res.Header.Get(name), value, name)
		}
	}
}

func TestGroupPresets(t *testing.T) {
	h := New(t)
	res := h.OK(h.Do(Req{Method: "GET", Path: "/group-presets", Ordered: true}))
	var ids []string
	for _, p := range res.List() {
		ids = append(ids, Get(p, "id").(string))
	}
	h.Equal(ids, []string{"beerpong", "kicker", "tabletennis", "chess", "billiards"}, "preset ids in order")
}

func TestSpringErrorShapes(t *testing.T) {
	h := New(t)
	h.SpringError(h.Do(Req{Method: "GET", Path: "/nope"}), 404, "Not Found", "/nope")
	h.SpringError(h.Do(Req{Method: "GET", Path: "/healthcheck/"}), 404, "Not Found", "/healthcheck/")
	h.SpringError(h.Do(Req{Method: "DELETE", Path: "/healthcheck"}), 405, "Method Not Allowed", "/healthcheck")
	h.SpringError(h.Do(Req{Method: "POST", Path: "/group-presets"}), 405, "Method Not Allowed", "/group-presets")

	bad := "{bad"
	h.SpringError(h.Do(Req{Method: "POST", Path: "/auth/signup", RawBody: &bad, ContentType: "application/json"}), 400, "Bad Request", "/auth/signup")
	h.SpringError(h.Do(Req{Method: "POST", Path: "/auth/signup"}), 400, "Bad Request", "/auth/signup")

	plain := `{"installationType":"IOS","deviceId":"x"}`
	h.SpringError(h.Do(Req{Method: "POST", Path: "/auth/signup", RawBody: &plain, ContentType: "text/plain"}), 415, "Unsupported Media Type", "/auth/signup")
}

func TestAssetNotFoundWithoutAuth(t *testing.T) {
	h := New(t)
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/00000000-0000-0000-0000-000000000000"}), 404, "assetNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/not-a-uuid"}), 404, "assetNotFound")
}
