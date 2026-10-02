package harness

import (
	"fmt"
	"strconv"
	"strings"
)

// Get walks a decoded JSON value: Get("data", "teams", "0", "id").
func Get(v any, path ...string) any {
	cur := v
	for _, p := range path {
		switch t := cur.(type) {
		case map[string]any:
			cur = t[p]
		case []any:
			i, err := strconv.Atoi(p)
			if err != nil || i < 0 || i >= len(t) {
				return nil
			}
			cur = t[i]
		default:
			return nil
		}
	}
	return cur
}

func (r *Resp) Get(path ...string) any { return Get(r.JSON, path...) }

// Data is the envelope payload.
func (r *Resp) Data(path ...string) any { return Get(r.JSON, append([]string{"data"}, path...)...) }

func (r *Resp) Str(path ...string) string {
	s, _ := r.Data(path...).(string)
	return s
}

func (r *Resp) List(path ...string) []any {
	l, _ := r.Data(path...).([]any)
	return l
}

func (r *Resp) Num(path ...string) float64 {
	f, _ := r.Data(path...).(float64)
	return f
}

func (r *Resp) ErrorCode() string {
	s, _ := Get(r.JSON, "error", "code").(string)
	return s
}

func (r *Resp) Text() string { return string(r.Raw) }

func (r *Resp) String() string {
	body := string(r.Raw)
	if len(body) > 2000 {
		body = body[:2000] + "…"
	}
	return fmt.Sprintf("HTTP %d %s", r.Status, strings.TrimSpace(body))
}

// OK asserts a 200 envelope and returns the response for chaining.
func (h *H) OK(r *Resp) *Resp {
	h.Helper()
	if r.Status != 200 || Get(r.JSON, "status") != "OK" || Get(r.JSON, "httpCode") != float64(200) {
		h.Fatalf("expected OK envelope, got %s", r)
	}
	return r
}

// Fail asserts an error envelope with the given HTTP status and error code.
func (h *H) Fail(r *Resp, status int, code string) *Resp {
	h.Helper()
	if r.Status != status || Get(r.JSON, "status") != "ERROR" || Get(r.JSON, "httpCode") != float64(status) || r.ErrorCode() != code {
		h.Fatalf("expected %d %q error envelope, got %s", status, code, r)
	}
	if d, _ := Get(r.JSON, "error", "description").(string); d == "" {
		h.Fatalf("error envelope without description: %s", r)
	}
	if _, has := r.JSON.(map[string]any)["data"]; has {
		h.Fatalf("error envelope must not carry data: %s", r)
	}
	return r
}

// SpringError asserts Spring Boot's default error body, which the API returns
// for routing, parsing and unhandled failures.
func (h *H) SpringError(r *Resp, status int, reason, path string) {
	h.Helper()
	if r.Status != status {
		h.Fatalf("expected HTTP %d, got %s", status, r)
	}
	m, ok := r.JSON.(map[string]any)
	if !ok {
		h.Fatalf("expected Spring error JSON, got %s", r)
	}
	if m["status"] != float64(status) || m["error"] != reason || m["path"] != path {
		h.Fatalf("unexpected Spring error body (want %d %q %q): %s", status, reason, path, r)
	}
	ts, _ := m["timestamp"].(string)
	if !timestampRe.MatchString(ts) {
		h.Fatalf("Spring error timestamp %q is not ISO-8601", ts)
	}
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		h.Fatalf("Spring error content type %q", r.Header.Get("Content-Type"))
	}
}

// Unauthorized asserts the plain-text 401 written by the auth filter.
func (h *H) Unauthorized(r *Resp, message string) {
	h.Helper()
	if r.Status != 401 || r.Text() != message {
		h.Fatalf("expected 401 %q, got %s", message, r)
	}
}

func (h *H) Equal(got, want any, what string) {
	h.Helper()
	if fmt.Sprint(got) != fmt.Sprint(want) {
		h.Fatalf("%s: got %v, want %v", what, got, want)
	}
}

func (h *H) True(cond bool, format string, args ...any) {
	h.Helper()
	if !cond {
		h.Fatalf(format, args...)
	}
}
