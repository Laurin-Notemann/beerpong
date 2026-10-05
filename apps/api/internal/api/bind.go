package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"math"
	"mime"
	"net/http"
	"strconv"
	"strings"
)

// Request bodies are bound the way Spring + Jackson did it, because the app
// (and anything else talking to the API) was written against that behavior:
// unknown fields are ignored, scalars are coerced ("5" -> 5, 5 -> "5"), null
// or missing primitives become zero values, and malformed input is a 400.

var errBadBody = errors.New("unreadable request body")

// readJSON decodes the body into a generic JSON value. A nil value means "no
// body". The returned response is set when the request must be rejected.
func readJSON(r *http.Request, required bool) (any, response) {
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		return nil, springError(http.StatusBadRequest)
	}
	contentType := r.Header.Get("Content-Type")
	if !isJSON(contentType) {
		// Spring only tolerates a non-JSON request when it has neither a
		// content type nor a body.
		if contentType == "" && len(raw) == 0 {
			return missingBody(required)
		}
		return nil, springError(http.StatusUnsupportedMediaType)
	}
	if len(bytes.TrimSpace(raw)) == 0 {
		return missingBody(required)
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil, springError(http.StatusBadRequest)
	}
	if v == nil {
		return missingBody(required)
	}
	return v, nil
}

func missingBody(required bool) (any, response) {
	if required {
		return nil, springError(http.StatusBadRequest)
	}
	return nil, nil
}

func isJSON(contentType string) bool {
	if contentType == "" {
		return false
	}
	media, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		return false
	}
	return media == "application/json" || (strings.HasPrefix(media, "application/") && strings.HasSuffix(media, "+json"))
}

// object is a JSON object being bound to a DTO.
type object map[string]any

func asObject(v any) (object, error) {
	m, ok := v.(map[string]any)
	if !ok {
		return nil, errBadBody
	}
	return m, nil
}

// has reports whether key is present (even if null).
func (o object) has(key string) bool {
	_, ok := o[key]
	return ok
}

// str binds a String field: nil when missing or null.
func (o object) str(key string) (*string, error) {
	return toStr(o[key])
}

func toStr(v any) (*string, error) {
	switch t := v.(type) {
	case nil:
		return nil, nil
	case string:
		return &t, nil
	case json.Number:
		s := t.String()
		return &s, nil
	case bool:
		s := strconv.FormatBool(t)
		return &s, nil
	default:
		return nil, errBadBody
	}
}

// integer binds an Integer field (nil when missing or null).
func (o object) integer(key string) (*int32, error) {
	switch t := o[key].(type) {
	case nil:
		return nil, nil
	case json.Number:
		return toInt32(string(t))
	case string:
		if strings.TrimSpace(t) == "" {
			return nil, nil
		}
		return toInt32(strings.TrimSpace(t))
	default:
		return nil, errBadBody
	}
}

// long binds a Long field (nil when missing or null), like integer.
func (o object) long(key string) (*int64, error) {
	var s string
	switch t := o[key].(type) {
	case nil:
		return nil, nil
	case json.Number:
		s = string(t)
	case string:
		if s = strings.TrimSpace(t); s == "" {
			return nil, nil
		}
	default:
		return nil, errBadBody
	}
	if i, err := strconv.ParseInt(s, 10, 64); err == nil {
		return &i, nil
	}
	// Jackson accepts floats for longs and truncates them.
	f, err := strconv.ParseFloat(s, 64)
	if err != nil || math.IsNaN(f) || f >= math.MaxInt64 || f < math.MinInt64 {
		return nil, errBadBody
	}
	i := int64(f)
	return &i, nil
}

// primitiveInt binds an int field: missing or null is 0.
func (o object) primitiveInt(key string) (int32, error) {
	v, err := o.integer(key)
	if err != nil || v == nil {
		return 0, err
	}
	return *v, nil
}

func toInt32(s string) (*int32, error) {
	if i, err := strconv.ParseInt(s, 10, 32); err == nil {
		v := int32(i)
		return &v, nil
	}
	// Jackson accepts floats for ints and truncates them.
	f, err := strconv.ParseFloat(s, 64)
	if err != nil || math.IsNaN(f) || f > math.MaxInt32 || f < math.MinInt32 {
		return nil, errBadBody
	}
	v := int32(f)
	return &v, nil
}

// primitiveFloat binds a double field: missing or null is 0.
func (o object) primitiveFloat(key string) (float64, error) {
	switch t := o[key].(type) {
	case nil:
		return 0, nil
	case json.Number:
		return strconv.ParseFloat(string(t), 64)
	case string:
		if strings.TrimSpace(t) == "" {
			return 0, nil
		}
		f, err := strconv.ParseFloat(strings.TrimSpace(t), 64)
		if err != nil {
			return 0, errBadBody
		}
		return f, nil
	default:
		return 0, errBadBody
	}
}

// primitiveBool binds a boolean field: missing or null is false.
func (o object) primitiveBool(key string) (bool, error) {
	switch t := o[key].(type) {
	case nil:
		return false, nil
	case bool:
		return t, nil
	case string:
		switch t {
		case "true":
			return true, nil
		case "false", "":
			return false, nil
		}
		return false, errBadBody
	case json.Number:
		return t.String() != "0", nil
	default:
		return false, errBadBody
	}
}

// enum binds an enum field by name (or ordinal, as Jackson allows). The
// result is the ordinal, which is also how the value is stored.
func (o object) enum(key string, names []string) (*int16, error) {
	switch t := o[key].(type) {
	case nil:
		return nil, nil
	case string:
		for i, n := range names {
			if n == t {
				v := int16(i)
				return &v, nil
			}
		}
		if t == "" {
			return nil, nil
		}
		return nil, errBadBody
	case json.Number:
		i, err := strconv.Atoi(t.String())
		if err != nil || i < 0 || i >= len(names) {
			return nil, errBadBody
		}
		v := int16(i)
		return &v, nil
	default:
		return nil, errBadBody
	}
}

// list binds a List field: nil when missing or null.
func (o object) list(key string) ([]any, bool, error) {
	switch t := o[key].(type) {
	case nil:
		return nil, false, nil
	case []any:
		return t, true, nil
	default:
		return nil, false, errBadBody
	}
}

// strList binds a List<String>. Null elements stay nil.
func (o object) strList(key string) ([]*string, bool, error) {
	items, present, err := o.list(key)
	if err != nil || !present {
		return nil, present, err
	}
	out := make([]*string, len(items))
	for i, item := range items {
		s, err := toStr(item)
		if err != nil {
			return nil, false, err
		}
		out[i] = s
	}
	return out, true, nil
}

// child binds a nested object; nil when missing or null.
func (o object) child(key string) (object, error) {
	switch t := o[key].(type) {
	case nil:
		return nil, nil
	case map[string]any:
		return t, nil
	default:
		return nil, errBadBody
	}
}
