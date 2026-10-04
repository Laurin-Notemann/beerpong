package api

import (
	"encoding/json"
	"slices"
	"strings"
	"testing"

	"github.com/laurin-notemann/beerpong/api-go/openapi"
)

// The app's client is generated from openapi.json, so an endpoint missing
// there can't be called and a documented one that doesn't exist fails at
// runtime.
func TestSpecMatchesRoutes(t *testing.T) {
	var spec struct {
		Paths map[string]map[string]json.RawMessage `json:"paths"`
	}
	if err := json.Unmarshal(openapi.Spec, &spec); err != nil {
		t.Fatal(err)
	}
	documented := map[string]bool{}
	for path, ops := range spec.Paths {
		for method := range ops {
			documented[strings.ToUpper(method)+" "+path] = true
		}
	}
	served := map[string]bool{}
	for path, methods := range (&Server{}).routes() {
		for method := range methods {
			served[method+" "+path] = true
		}
	}
	for _, op := range sortedKeys(served) {
		if !documented[op] {
			t.Errorf("%s is served but not in openapi.json", op)
		}
	}
	for _, op := range sortedKeys(documented) {
		if !served[op] {
			t.Errorf("%s is in openapi.json but not served", op)
		}
	}
}

func sortedKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	return keys
}
