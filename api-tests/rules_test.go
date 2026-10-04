package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestWriteRules(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Rules", "a")
	ws := h.Listen(g.ID)
	put := func(body any) *Resp {
		return h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rules"), Auth: owner.Bearer(), Body: body, Ordered: true})
	}

	res := h.OK(put([]any{
		map[string]any{"title": "Third", "description": "c"},
		map[string]any{"title": "First", "description": "a"},
		map[string]any{"title": "Second", "description": "b"},
	}))
	h.Equal(len(res.List()), 3, "rules written")
	h.Equal(Get(res.List()[0], "seasonId"), g.SeasonID, "rule season")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "rulesWrite", "rules event")
	h.Equal(EventType(ev[0]), "RULES", "rules event type")
	h.Equal(len(Get(ev[0], "body").([]any)), 3, "event carries all rules")

	// the write response keeps the request order
	var titles []string
	for _, r := range res.List() {
		titles = append(titles, Get(r, "title").(string))
	}
	h.Equal(titles, []string{"Third", "First", "Second"}, "rule order")
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rules"), Auth: owner.Bearer()})).List()), 3, "rules stored")

	h.OK(put([]any{}))
	ws.Expect(1)
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rules"), Auth: owner.Bearer()})).List()), 0, "rules cleared")

	for _, bad := range []any{
		[]any{map[string]any{"title": "", "description": "x"}},
		[]any{map[string]any{"title": "x", "description": " "}},
		[]any{map[string]any{"title": "x"}},
		[]any{map[string]any{"title": "ok", "description": "ok"}, map[string]any{"description": "x"}},
	} {
		h.Fail(put(bad), 400, "ruleInvalidDto")
	}
	h.SpringError(put(map[string]any{"title": "not a list"}), 400, "Bad Request", g.SeasonPath("/rules"))
	ws.ExpectNone()

	other := h.NewGroup(owner, "Other", "z")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + other.SeasonID + "/rules"), Auth: owner.Bearer(), Body: []any{}}), 404, "seasonHasDifferentGroup")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/nope/rules"), Auth: owner.Bearer(), Body: []any{}}), 404, "seasonNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + other.SeasonID + "/rules"), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")
}

// TestRuleOrderIsTheWrittenOrder: GET returns rules in the order they were
// written, even once their rows no longer sit in that order on disk. Two
// updates of an indexed column move the first row to the end of the table
// and of the index, like rewrites that reuse freed space do.
func TestRuleOrderIsTheWrittenOrder(t *testing.T) {
	h := New(t)
	db := h.DB()
	owner := h.NewUser()
	g := h.NewGroup(owner, "Rule order", "a")
	order := []string{"C", "A", "B", "D"}
	var body []any
	for _, title := range order {
		body = append(body, map[string]any{"title": title, "description": "x"})
	}
	written := h.OK(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rules"), Auth: owner.Bearer(), Body: body, Ordered: true}))
	first := Get(written.List()[0], "id")
	h.Exec(db, "UPDATE rules SET season_id = NULL WHERE id = $1", first)
	h.Exec(db, "UPDATE rules SET season_id = $2 WHERE id = $1", first, g.SeasonID)

	var got []string
	for _, r := range h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rules"), Auth: owner.Bearer(), Ordered: true})).List() {
		got = append(got, Get(r, "title").(string))
	}
	h.Equal(got, order, "stored rule order")
}

func TestRuleMoves(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Rule moves", "a")
	ws := h.Listen(g.ID)

	created := h.OK(h.Do(Req{Method: "POST", Path: g.SeasonPath("/rule-moves"), Auth: owner.Bearer(), Body: map[string]any{"name": "Island", "pointsForScorer": 3, "pointsForTeam": 1, "finishingMove": false}}))
	h.Equal(created.Str("name"), "Island", "name")
	h.Equal(created.Num("pointsForScorer"), 3, "scorer points")
	h.Equal(created.Str("seasonId"), g.SeasonID, "season")
	h.Equal(created.Num("cups"), 1, "cups default to 1 when the app doesn't send them")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "ruleMovesCreate", "create event")
	h.Equal(EventType(ev[0]), "RULE_MOVES", "event type")

	all := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rule-moves"), Auth: owner.Bearer()}))
	h.Equal(len(all.List()), 9, "default moves plus one")

	updated := h.OK(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rule-moves/" + created.Str("id")), Auth: owner.Bearer(), Body: map[string]any{"name": "Island 2", "pointsForScorer": 0, "pointsForTeam": 0, "finishingMove": true}}))
	h.Equal(updated.Str("name"), "Island 2", "renamed")
	h.Equal(updated.Data("finishingMove"), true, "finishing")
	h.Equal(updated.Num("cups"), 0, "a finish without cups takes none")
	ev = ws.Expect(1)
	h.Equal(EventScope(ev[0]), "ruleMovesUpdate", "update event")

	withCups := h.OK(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rule-moves/" + created.Str("id")), Auth: owner.Bearer(), Body: map[string]any{"name": "Island", "pointsForScorer": 3, "pointsForTeam": 1, "finishingMove": false, "cups": 3}}))
	h.Equal(withCups.Num("cups"), 3, "cups sent by the app")
	ws.Expect(1)
	ringOfWater := h.OK(h.Do(Req{Method: "POST", Path: g.SeasonPath("/rule-moves"), Auth: owner.Bearer(), Body: map[string]any{"name": "Finish - Ring of water", "pointsForScorer": 1, "pointsForTeam": 10, "finishingMove": true}}))
	h.Equal(ringOfWater.Num("cups"), 6, "default cups by name")
	ws.Expect(1)

	for _, bad := range []map[string]any{
		{"name": "", "pointsForScorer": 1},
		{"name": "  "},
		{"pointsForScorer": 1},
		{"name": "x", "pointsForScorer": -1},
		{"name": "x", "pointsForTeam": -1},
		{"name": "x", "cups": -1},
	} {
		h.Fail(h.Do(Req{Method: "POST", Path: g.SeasonPath("/rule-moves"), Auth: owner.Bearer(), Body: bad}), 400, "ruleMoveInvalidDto")
		h.Fail(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rule-moves/" + created.Str("id")), Auth: owner.Bearer(), Body: bad}), 400, "ruleMoveInvalidDto")
	}
	h.Fail(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rule-moves/nope"), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 404, "ruleMoveNotFound")

	other := h.NewGroup(owner, "Other", "z")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rule-moves/" + other.Moves["Normal"]), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 500, "ruleMoveValidationFailed")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + other.SeasonID + "/rule-moves"), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")
	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/seasons/nope/rule-moves"), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 404, "seasonNotFound")
	ws.ExpectNone()

	oldMove := g.Moves["Normal"]
	oldSeason := g.SeasonID
	h.StartSeason(g, "Old")
	ws.Expect(1)
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + oldSeason + "/rule-moves/" + oldMove), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 403, "seasonAlreadyEnded")
	// a move of the closed season can't be edited through the new season either
	h.Fail(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rule-moves/" + oldMove), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 500, "ruleMoveValidationFailed")
}
