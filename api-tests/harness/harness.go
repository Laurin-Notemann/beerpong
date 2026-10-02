package harness

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

var httpClient = &http.Client{Timeout: 30 * time.Second}

// H is the per-test handle: every request made through it is checked by the
// test and appended to a transcript that is compared against a golden file.
type H struct {
	*testing.T
	Env  Env
	norm *Normalizer

	mu         sync.Mutex
	transcript []Entry
}

// Entry is one recorded exchange (or a batch of realtime events).
type Entry struct {
	Request  string `json:"request,omitempty"`
	Body     any    `json:"body,omitempty"`
	Status   int    `json:"status,omitempty"`
	Response any    `json:"response,omitempty"`
	Events   any    `json:"events,omitempty"`
	Note     string `json:"note,omitempty"`
}

func New(t *testing.T) *H {
	t.Helper()
	env := LoadEnv()
	if env.BaseURL == "" {
		t.Skip("API_BASE_URL not set")
	}
	h := &H{T: t, Env: env, norm: NewNormalizer()}
	t.Cleanup(h.finish)
	return h
}

// Req describes one HTTP request.
type Req struct {
	Method string
	Path   string
	// Body is marshalled to JSON unless RawBody is set.
	Body    any
	RawBody *string
	// ContentType defaults to application/json when a body is present.
	ContentType string
	// Auth is sent verbatim as the Authorization header when set.
	Auth string
	// Ordered keeps array order in the transcript. Leave false for lists the
	// backend returns in database order.
	Ordered bool
	// Skip excludes the exchange from the transcript (still returned).
	Skip bool
}

// Resp is a decoded response.
type Resp struct {
	Status int
	Header http.Header
	Raw    []byte
	JSON   any
}

func (h *H) Do(r Req) *Resp {
	h.Helper()
	var body io.Reader
	var recordedBody any
	contentType := r.ContentType
	switch {
	case r.RawBody != nil:
		body = strings.NewReader(*r.RawBody)
		recordedBody = *r.RawBody
	case r.Body != nil:
		b, err := json.Marshal(r.Body)
		if err != nil {
			h.Fatalf("marshal body: %v", err)
		}
		body = bytes.NewReader(b)
		var decoded any
		_ = json.Unmarshal(b, &decoded)
		recordedBody = decoded
		if contentType == "" {
			contentType = "application/json"
		}
	}
	req, err := http.NewRequest(r.Method, h.Env.BaseURL+r.Path, body)
	if err != nil {
		h.Fatalf("build request: %v", err)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if r.Auth != "" {
		req.Header.Set("Authorization", r.Auth)
	}
	res, err := httpClient.Do(req)
	if err != nil {
		h.Fatalf("%s %s: %v", r.Method, r.Path, err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		h.Fatalf("read body: %v", err)
	}
	out := &Resp{Status: res.StatusCode, Header: res.Header, Raw: raw}
	if len(raw) > 0 && json.Valid(raw) {
		dec := json.NewDecoder(bytes.NewReader(raw))
		dec.UseNumber()
		_ = dec.Decode(&out.JSON)
		out.JSON = numbersToFloat(out.JSON)
	}
	if !r.Skip {
		// Normalize in reading order (path, body, response) so ids are numbered
		// the way a person reads the transcript.
		request := r.Method + " " + h.norm.Path(r.Path)
		var nb any
		if recordedBody != nil {
			if s, ok := recordedBody.(string); ok {
				nb = h.norm.str("", s)
			} else {
				nb = h.norm.Value(recordedBody, false)
			}
		}
		var recorded any
		if out.JSON != nil {
			recorded = h.norm.Value(out.JSON, !r.Ordered)
		} else if len(raw) > 0 {
			recorded = h.norm.str("", string(raw))
		}
		h.record(Entry{
			Request:  request,
			Body:     nb,
			Status:   res.StatusCode,
			Response: recorded,
		})
	}
	return out
}

// Note adds a free-form marker to the transcript, which makes golden diffs
// easier to read.
func (h *H) Note(format string, args ...any) {
	h.record(Entry{Note: fmt.Sprintf(format, args...)})
}

func (h *H) record(e Entry) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.transcript = append(h.transcript, e)
}

func numbersToFloat(v any) any {
	switch t := v.(type) {
	case map[string]any:
		for k, e := range t {
			t[k] = numbersToFloat(e)
		}
		return t
	case []any:
		for i, e := range t {
			t[i] = numbersToFloat(e)
		}
		return t
	case json.Number:
		f, _ := t.Float64()
		return f
	default:
		return v
	}
}

func (h *H) goldenPath() string {
	name := strings.ReplaceAll(h.Name(), "/", "__")
	return filepath.Join("testdata", "golden", name+".json")
}

func (h *H) finish() {
	if h.Env.Golden == "off" || h.Failed() || h.Skipped() {
		return
	}
	h.mu.Lock()
	got, err := json.MarshalIndent(h.transcript, "", "  ")
	h.mu.Unlock()
	if err != nil {
		h.Errorf("marshal transcript: %v", err)
		return
	}
	path := h.goldenPath()
	if h.Env.Golden == "record" {
		if err := os.WriteFile(path, append(got, '\n'), 0o644); err != nil {
			h.Errorf("write golden: %v", err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		h.Errorf("no golden transcript at %s (record one against the reference backend with GOLDEN=record)", path)
		return
	}
	var wantEntries, gotEntries []json.RawMessage
	_ = json.Unmarshal(want, &wantEntries)
	_ = json.Unmarshal(got, &gotEntries)
	reported := 0
	for i := 0; i < max(len(wantEntries), len(gotEntries)); i++ {
		var w, g string
		if i < len(wantEntries) {
			w = indent(wantEntries[i])
		}
		if i < len(gotEntries) {
			g = indent(gotEntries[i])
		}
		if w != g {
			h.Errorf("transcript entry %d differs from %s\n--- want\n%s\n--- got\n%s", i, path, w, g)
			reported++
			if reported >= 3 {
				h.Errorf("(further differences omitted)")
				return
			}
		}
	}
}

func indent(raw json.RawMessage) string {
	var b bytes.Buffer
	if err := json.Indent(&b, raw, "", "  "); err != nil {
		return string(raw)
	}
	return b.String()
}
