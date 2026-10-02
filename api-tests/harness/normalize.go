package harness

import (
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

var (
	uuidRe      = regexp.MustCompile(`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`)
	uuidFullRe  = regexp.MustCompile(`^` + uuidRe.String() + `$`)
	jwtRe       = regexp.MustCompile(`^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$`)
	timestampRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})(\[[^\]]+\])?$`)
	inviteRe    = regexp.MustCompile(`^[A-Z0-9]{9}$`)
	inviteQuery = regexp.MustCompile(`inviteCode=[A-Z0-9]{9}\b`)
)

// Normalizer replaces values that legitimately differ between runs (ids,
// timestamps, tokens, signatures) with stable placeholders. Ids are numbered by
// first appearance within one test, so "the id returned by create is the id in
// the next GET" stays visible in the transcript.
type Normalizer struct {
	ids map[string]int
}

func NewNormalizer() *Normalizer {
	return &Normalizer{ids: map[string]int{}}
}

func (n *Normalizer) id(raw string) string {
	key := strings.ToLower(raw)
	num, ok := n.ids[key]
	if !ok {
		num = len(n.ids) + 1
		n.ids[key] = num
	}
	return fmt.Sprintf("<id%d>", num)
}

// Register numbers an id ahead of its first appearance in a response. Fixtures
// use it to number ids in a stable order (by name) instead of whatever order
// the backend happened to return them in.
func (n *Normalizer) Register(id string) {
	if id != "" {
		n.id(id)
	}
}

// Path normalizes the ids inside a request path or query.
func (n *Normalizer) Path(p string) string {
	p = inviteQuery.ReplaceAllString(p, "inviteCode=<inviteCode>")
	return uuidRe.ReplaceAllStringFunc(p, n.id)
}

// Value normalizes a decoded JSON value. With unordered set, arrays are sorted
// by their id-masked content first, because Java returns most lists in
// whatever order Postgres hands rows back.
func (n *Normalizer) Value(v any, unordered bool) any {
	if unordered {
		v = n.sortArrays(v)
	}
	return n.walk("", v)
}

func (n *Normalizer) walk(key string, v any) any {
	switch t := v.(type) {
	case map[string]any:
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		out := make(map[string]any, len(t))
		for _, k := range keys {
			out[k] = n.walk(k, t[k])
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, e := range t {
			out[i] = n.walk(key, e)
		}
		return out
	case string:
		return n.str(key, t)
	case float64:
		return roundFloat(t)
	case json.Number:
		f, err := t.Float64()
		if err != nil {
			return t.String()
		}
		return roundFloat(f)
	default:
		return v
	}
}

func (n *Normalizer) str(key, s string) string {
	switch {
	case uuidFullRe.MatchString(s):
		return n.id(s)
	case jwtRe.MatchString(s):
		return "<jwt>"
	case timestampRe.MatchString(s):
		return "<ts>"
	case key == "inviteCode" && inviteRe.MatchString(s):
		return "<inviteCode>"
	case strings.Contains(s, "X-Amz-Signature="):
		return n.presigned(s)
	default:
		return uuidRe.ReplaceAllStringFunc(s, n.id)
	}
}

// presigned keeps what a client depends on (host, key, signed headers, expiry)
// and drops what changes every call (date, credential, signature).
func (n *Normalizer) presigned(s string) string {
	u, err := url.Parse(s)
	if err != nil {
		return "<presigned:unparseable>"
	}
	q := u.Query()
	names := make([]string, 0, len(q))
	for k := range q {
		names = append(names, k)
	}
	sort.Strings(names)
	return fmt.Sprintf("<presigned %s://%s%s params=%s signedHeaders=%s expires=%s>",
		u.Scheme, u.Host, n.Path(u.Path), strings.Join(names, ","), q.Get("X-Amz-SignedHeaders"), q.Get("X-Amz-Expires"))
}

// roundFloat keeps 10 significant digits: Java's Math.pow/exp and Go's math
// package can disagree in the last ulp, which is noise for Elo ratings.
func roundFloat(f float64) any {
	if f == math.Trunc(f) && math.Abs(f) < 1e15 {
		return int64(f)
	}
	r, _ := strconv.ParseFloat(strconv.FormatFloat(f, 'g', 10, 64), 64)
	return r
}

func (n *Normalizer) sortArrays(v any) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, e := range t {
			out[k] = n.sortArrays(e)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, e := range t {
			out[i] = n.sortArrays(e)
		}
		sort.SliceStable(out, func(i, j int) bool { return n.maskKey(out[i]) < n.maskKey(out[j]) })
		return out
	default:
		return v
	}
}

// maskKey is a canonical JSON rendering in which ids already numbered keep
// their number and every other id, timestamp and token becomes the same
// marker, so sorting does not depend on random values.
func (n *Normalizer) maskKey(v any) string {
	b, _ := json.Marshal(n.mask(v))
	return string(b)
}

func (n *Normalizer) mask(v any) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, e := range t {
			out[k] = n.mask(e)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, e := range t {
			out[i] = n.mask(e)
		}
		return out
	case string:
		switch {
		case timestampRe.MatchString(t):
			return "<ts>"
		case jwtRe.MatchString(t):
			return "<jwt>"
		case strings.Contains(t, "X-Amz-Signature="):
			return "<presigned>"
		}
		return uuidRe.ReplaceAllStringFunc(t, func(id string) string {
			if num, ok := n.ids[strings.ToLower(id)]; ok {
				return fmt.Sprintf("<id%d>", num)
			}
			return "<id>"
		})
	case float64:
		return roundFloat(t)
	default:
		return v
	}
}
