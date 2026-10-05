package api

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func parseOps(t *testing.T, raw string) ([]*liveMatchOpDTO, bool) {
	t.Helper()
	var body object
	dec := json.NewDecoder(strings.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&body); err != nil {
		t.Fatal(err)
	}
	ops, present, err := parseLiveOps(body, "ops")
	if err != nil {
		t.Fatalf("parseLiveOps(%s): %v", raw, err)
	}
	return ops, present
}

func opJSON(id, rest string) string {
	return `{"id":"` + id + `",` + rest + `}`
}

func TestNormalizeLiveOps(t *testing.T) {
	id, p, m := uuid.NewString(), uuid.NewString(), uuid.NewString()
	ten := make([]string, 10)
	eleven := make([]string, 11)
	for i := range eleven {
		eleven[i] = `"` + uuid.NewString() + `"`
		if i < 10 {
			ten[i] = eleven[i]
		}
	}
	cups := func(n int) string {
		return `[` + strings.Repeat(`{"x":0,"y":9},`, n-1) + `{"x":0,"y":9}]`
	}

	valid := map[string]string{
		"set teams":          `"type":"SET_TEAMS","redPlayerIds":["` + p + `"],"bluePlayerIds":[]`,
		"set teams of ten":   `"type":"SET_TEAMS","redPlayerIds":[` + strings.Join(ten, ",") + `],"bluePlayerIds":[]`,
		"remove player":      `"type":"SET_PLAYER_TEAM","playerId":"` + p + `"`,
		"player to blue":     `"type":"SET_PLAYER_TEAM","playerId":"` + p + `","team":"blue"`,
		"adjust":             `"type":"ADJUST_MOVE","playerId":"` + p + `","moveId":"` + m + `","delta":-20`,
		"hit":                `"type":"RECORD_CUP_HIT","team":"red","playerId":"` + p + `","moveId":"` + m + `","cups":` + cups(10),
		"hit with finish":    `"type":"RECORD_CUP_HIT","team":"red","playerId":"` + p + `","moveId":"` + m + `","finishMoveId":"` + m + `","cups":` + cups(1),
		"undo":               `"type":"UNDO_CUP_HIT","team":"blue","cup":{"x":9,"y":0}`,
		"miss":               `"type":"RECORD_MISS","playerId":"` + p + `"`,
		"undo miss":          `"type":"UNDO_MISS","playerId":"` + p + `"`,
		"numeric strings ok": `"type":"ADJUST_MOVE","playerId":"` + p + `","moveId":"` + m + `","delta":"5"`,
	}
	for name, rest := range valid {
		ops, present := parseOps(t, `{"ops":[`+opJSON(id, rest)+`]}`)
		if _, ok := normalizeLiveOps(ops, present); !ok {
			t.Errorf("%s: rejected", name)
		}
	}

	invalid := map[string]string{
		"no type":            `"playerId":"` + p + `"`,
		"zero delta":         `"type":"ADJUST_MOVE","playerId":"` + p + `","moveId":"` + m + `","delta":0`,
		"no delta":           `"type":"ADJUST_MOVE","playerId":"` + p + `","moveId":"` + m + `"`,
		"delta 21":           `"type":"ADJUST_MOVE","playerId":"` + p + `","moveId":"` + m + `","delta":21`,
		"delta -21":          `"type":"ADJUST_MOVE","playerId":"` + p + `","moveId":"` + m + `","delta":-21`,
		"no player":          `"type":"ADJUST_MOVE","moveId":"` + m + `","delta":1`,
		"player not a uuid":  `"type":"ADJUST_MOVE","playerId":"nope","moveId":"` + m + `","delta":1`,
		"miss of no one":     `"type":"RECORD_MISS"`,
		"green team":         `"type":"SET_PLAYER_TEAM","playerId":"` + p + `","team":"green"`,
		"x is 10":            `"type":"UNDO_CUP_HIT","team":"red","cup":{"x":10,"y":0}`,
		"y is -1":            `"type":"UNDO_CUP_HIT","team":"red","cup":{"x":0,"y":-1}`,
		"no cup":             `"type":"UNDO_CUP_HIT","team":"red"`,
		"no cups":            `"type":"RECORD_CUP_HIT","team":"red","playerId":"` + p + `","moveId":"` + m + `","cups":[]`,
		"11 cups":            `"type":"RECORD_CUP_HIT","team":"red","playerId":"` + p + `","moveId":"` + m + `","cups":` + cups(11),
		"null cup":           `"type":"RECORD_CUP_HIT","team":"red","playerId":"` + p + `","moveId":"` + m + `","cups":[null]`,
		"finish not a uuid":  `"type":"RECORD_CUP_HIT","team":"red","playerId":"` + p + `","moveId":"` + m + `","finishMoveId":"x","cups":` + cups(1),
		"teams missing":      `"type":"SET_TEAMS","redPlayerIds":[]`,
		"11 players on team": `"type":"SET_TEAMS","redPlayerIds":[` + strings.Join(eleven, ",") + `],"bluePlayerIds":[]`,
		"null player":        `"type":"SET_TEAMS","redPlayerIds":[null],"bluePlayerIds":[]`,
	}
	for name, rest := range invalid {
		ops, present := parseOps(t, `{"ops":[`+opJSON(id, rest)+`]}`)
		if _, ok := normalizeLiveOps(ops, present); ok {
			t.Errorf("%s: accepted", name)
		}
	}

	for name, raw := range map[string]string{
		"id not a uuid": `{"ops":[` + opJSON("nope", `"type":"UNDO_CUP_HIT","team":"red","cup":{"x":0,"y":0}`) + `]}`,
		"null op":       `{"ops":[null]}`,
		"no ops":        `{}`,
		"null ops":      `{"ops":null}`,
	} {
		ops, present := parseOps(t, raw)
		if _, ok := normalizeLiveOps(ops, present); ok {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestNormalizeLiveOpsLimit(t *testing.T) {
	op := func() *liveMatchOpDTO {
		return &liveMatchOpDTO{ID: uuid.NewString(), Type: ptr("UNDO_CUP_HIT"), Team: ptr("red"), Cup: &cupPositionDTO{X: ptr(int32(0)), Y: ptr(int32(0))}}
	}
	ops := make([]*liveMatchOpDTO, maxOpsPerRequest)
	for i := range ops {
		ops[i] = op()
	}
	if _, ok := normalizeLiveOps(ops, true); !ok {
		t.Error("50 ops rejected")
	}
	if _, ok := normalizeLiveOps(append(ops, op()), true); ok {
		t.Error("51 ops accepted")
	}
}

// Only the fields of an op's type are kept, so nothing else is stored or
// broadcast.
func TestNormalizeLiveOpDropsOtherFields(t *testing.T) {
	p, m := uuid.NewString(), uuid.NewString()
	ops, present := parseOps(t, `{"ops":[`+opJSON(uuid.NewString(),
		`"type":"SET_PLAYER_TEAM","playerId":"`+p+`","team":"red","moveId":"`+m+`","delta":3,"cups":[{"x":1,"y":1}],"redPlayerIds":["`+p+`"]`)+`]}`)
	got, ok := normalizeLiveOps(ops, present)
	if !ok {
		t.Fatal("rejected")
	}
	payload, err := opPayload(got[0])
	if err != nil {
		t.Fatal(err)
	}
	if want := `{"playerId":"` + p + `","team":"red"}`; payload != want {
		t.Errorf("payload = %s, want %s", payload, want)
	}

	// an emptied team list is part of a SET_TEAMS payload, not dropped
	ops, present = parseOps(t, `{"ops":[`+opJSON(uuid.NewString(), `"type":"SET_TEAMS","redPlayerIds":[],"bluePlayerIds":["`+p+`"]`)+`]}`)
	got, _ = normalizeLiveOps(ops, present)
	if payload, _ = opPayload(got[0]); payload != `{"bluePlayerIds":["`+p+`"],"redPlayerIds":[]}` {
		t.Errorf("payload = %s", payload)
	}
}
