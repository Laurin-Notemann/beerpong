package apitests

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The app's types are generated from apps/api/openapi/openapi.json, so a
// field it marks required must be in every response, and only a nullable one
// may be null. This checks every recorded 200 response against the document;
// it needs no running API.
func TestGoldensMatchTheAPIDocument(t *testing.T) {
	var doc struct {
		Paths      map[string]map[string]operation `json:"paths"`
		Components struct {
			Schemas map[string]*schema `json:"schemas"`
		} `json:"components"`
	}
	raw, err := os.ReadFile("../apps/api/openapi/openapi.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatal(err)
	}
	files, err := filepath.Glob("testdata/golden/*.json")
	if err != nil || len(files) == 0 {
		t.Fatalf("no goldens: %v", err)
	}
	checked := 0
	for _, file := range files {
		raw, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		var entries []struct {
			Request  string `json:"request"`
			Status   int    `json:"status"`
			Response any    `json:"response"`
		}
		if err := json.Unmarshal(raw, &entries); err != nil {
			t.Fatalf("%s: %v", file, err)
		}
		for i, e := range entries {
			method, path, found := strings.Cut(e.Request, " ")
			if !found || e.Status != 200 {
				continue
			}
			s := responseSchema(doc.Paths, strings.ToLower(method), path)
			if s == nil {
				continue
			}
			c := checker{schemas: doc.Components.Schemas}
			c.check(fmt.Sprintf("%s #%d %s: response", filepath.Base(file), i, e.Request), s, e.Response)
			for _, problem := range c.problems {
				t.Error(problem)
			}
			checked++
		}
	}
	if checked == 0 {
		t.Fatal("no response was checked")
	}
}

type operation struct {
	Responses map[string]struct {
		Content map[string]struct {
			Schema *schema `json:"schema"`
		} `json:"content"`
	} `json:"responses"`
}

type schema struct {
	Ref        string             `json:"$ref"`
	AllOf      []*schema          `json:"allOf"`
	Type       string             `json:"type"`
	Nullable   bool               `json:"nullable"`
	Properties map[string]*schema `json:"properties"`
	Required   []string           `json:"required"`
	Items      *schema            `json:"items"`
}

// responseSchema is the documented 200 body of the request; paths match
// their template segment by segment, literal segments before parameters.
func responseSchema(paths map[string]map[string]operation, method, path string) *schema {
	path, _, _ = strings.Cut(path, "?")
	segments := strings.Split(path, "/")
	var best *schema
	bestLiterals := -1
	for template, ops := range paths {
		op, ok := ops[method]
		if !ok {
			continue
		}
		parts := strings.Split(template, "/")
		if len(parts) != len(segments) {
			continue
		}
		literals := 0
		for i, part := range parts {
			switch {
			case strings.HasPrefix(part, "{"):
			case part == segments[i]:
				literals++
			default:
				literals = -1
			}
			if literals < 0 {
				break
			}
		}
		if literals > bestLiterals {
			best, bestLiterals = op.Responses["200"].Content["application/json"].Schema, literals
		}
	}
	return best
}

type checker struct {
	schemas  map[string]*schema
	problems []string
}

func (c *checker) check(where string, s *schema, value any) {
	nullable := s.Nullable
	for s.Ref != "" || len(s.AllOf) == 1 {
		if s.Ref != "" {
			s = c.schemas[strings.TrimPrefix(s.Ref, "#/components/schemas/")]
		} else {
			s = s.AllOf[0]
		}
		if s == nil {
			c.problems = append(c.problems, where+": unknown schema")
			return
		}
		nullable = nullable || s.Nullable
	}
	switch v := value.(type) {
	case nil:
		if !nullable {
			c.problems = append(c.problems, where+" is null, but the document doesn't mark it nullable")
		}
	case map[string]any:
		for _, key := range s.Required {
			if _, ok := v[key]; !ok {
				c.problems = append(c.problems, fmt.Sprintf("%s has no %q, which the document marks required", where, key))
			}
		}
		for key, field := range v {
			if p := s.Properties[key]; p != nil {
				c.check(where+"."+key, p, field)
			}
		}
	case []any:
		if s.Items != nil {
			for i, item := range v {
				c.check(fmt.Sprintf("%s[%d]", where, i), s.Items, item)
			}
		}
	}
}
