package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

// finishBody is the teams of a valid 1v1: a (blue) scores the finish, c (red) has points.
func finishBody(g *Group, expectedSeq int) map[string]any {
	body := g.MatchBody(
		[]Member{{"a", map[string]int{"Normal": 2, "Finish - Normal": 1}}},
		[]Member{{"c", map[string]int{"Normal": 3}}},
	)
	body["expectedSeq"] = expectedSeq
	return body
}

// finishLiveMatch and abandonLiveMatch stay out of the transcript; the
// recorded variants are for the exchanges the goldens should show.
func finishLiveMatch(h *H, u *User, g *Group, id string, body map[string]any) *Resp {
	h.Helper()
	return h.Do(Req{Method: "POST", Path: liveMatchPath(g, "/"+id+"/finish"), Auth: u.Bearer(), Body: body, Skip: true})
}

func finishLiveMatchRecorded(h *H, u *User, g *Group, id string, body map[string]any) *Resp {
	h.Helper()
	return h.Do(Req{Method: "POST", Path: liveMatchPath(g, "/"+id+"/finish"), Auth: u.Bearer(), Body: body, Ordered: true})
}

func abandonLiveMatch(h *H, u *User, g *Group, id string) *Resp {
	h.Helper()
	return h.Do(Req{Method: "DELETE", Path: liveMatchPath(g, "/"+id), Auth: u.Bearer(), Skip: true})
}

func abandonLiveMatchRecorded(h *H, u *User, g *Group, id string) *Resp {
	h.Helper()
	return h.Do(Req{Method: "DELETE", Path: liveMatchPath(g, "/"+id), Auth: u.Bearer(), Ordered: true})
}

func seasonMatchIDs(h *H, u *User, g *Group) []any {
	h.Helper()
	ids := []any{}
	for _, m := range h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches"), Auth: u.Bearer(), Skip: true})).List() {
		ids = append(ids, Get(m, "id"))
	}
	return ids
}

func TestLiveMatchFinish(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live finish", "a", "b", "c", "d")
	id := newLiveMatchID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "c"), adjustMove(g, "a", 2)))
	ws := h.Listen(g.ID)

	finished := h.OK(finishLiveMatchRecorded(h, owner, g, id, finishBody(g, 2)))
	matchID := finished.Str("resultMatchId")
	h.True(matchID != "", "resultMatchId")
	h.Equal(finished.Str("status"), "FINISHED", "status")
	h.True(finished.Str("endedAt") != "", "endedAt")
	h.Equal(finished.Num("lastSeq"), 2, "lastSeq")
	h.Equal(len(finished.List("ops")), 2, "the answer keeps the ops")

	// the match exists like any other and is the only one
	h.Equal(seasonMatchIDs(h, owner, g), []any{matchID}, "season matches")
	overview := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/" + matchID + "/overview"), Auth: owner.Bearer(), Skip: true}))
	h.Equal(len(overview.List("blueTeam", "members")), 1, "blue members")

	// the same events as a created match, then the end of the live match without ops
	ev := ws.Expect(2)
	h.Equal(EventType(ev[0]), "MATCHES", "first event type")
	h.Equal(EventScope(ev[0]), "matchCreate", "first event scope")
	h.Equal(Get(ev[0], "body", "id"), matchID, "created match")
	h.Equal(EventType(ev[1]), "LIVE_MATCHES", "second event type")
	h.Equal(EventScope(ev[1]), "liveMatchEnd", "second event scope")
	h.Equal(Get(ev[1], "body", "status"), "FINISHED", "event status")
	h.Equal(Get(ev[1], "body", "resultMatchId"), matchID, "event result match")
	h.Equal(Get(ev[1], "body", "lastSeq"), 2.0, "event lastSeq")
	h.Equal(Get(ev[1], "body", "ops"), []any{}, "end event has no ops")

	// finishing again, even with a stale seq or other teams, returns the same live match
	again := h.OK(finishLiveMatch(h, owner, g, id, finishBody(g, 99)))
	h.Equal(again.Data(), finished.Data(), "second finish")
	h.Equal(seasonMatchIDs(h, owner, g), []any{matchID}, "still one match")
	ws.ExpectNone()

	// abandoning a finished live match changes nothing
	kept := h.OK(abandonLiveMatch(h, owner, g, id))
	h.Equal(kept.Data(), finished.Data(), "abandon keeps FINISHED")
	h.Equal(h.OK(getLiveMatchQuiet(h, owner, g, id)).Data(), finished.Data(), "GET")
	ws.ExpectNone()

	// no ops after the end
	h.Fail(appendLiveOps(h, owner, g, id, adjustMove(g, "a", 1)), 409, "liveMatchEnded")
	h.Equal(h.OK(getLiveMatchQuiet(h, owner, g, id)).Num("lastSeq"), 2, "nothing appended")
	ws.ExpectNone()
}

func TestLiveMatchFinishRejections(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live finish rejections", "a", "b", "c", "d")
	other := h.NewGroup(owner, "Live finish other", "x", "y")
	id := newLiveMatchID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "c")))
	ws := h.Listen(g.ID)

	// someone else added a point since the finishing phone reduced the log
	h.OK(appendLiveOps(h, owner, g, id, adjustMove(g, "a", 1)))
	ws.Expect(1)
	h.Fail(finishLiveMatchRecorded(h, owner, g, id, finishBody(g, 1)), 409, "liveMatchStale")

	// the same validation as POST /matches: exactly one finish
	twoFinishes := g.MatchBody(
		[]Member{{"a", map[string]int{"Finish - Normal": 1}}},
		[]Member{{"c", map[string]int{"Finish - Normal": 1}}},
	)
	twoFinishes["expectedSeq"] = 2
	h.Fail(finishLiveMatch(h, owner, g, id, twoFinishes), 400, "matchDtoValidationFailed")
	noFinish := g.MatchBody([]Member{{"a", map[string]int{"Normal": 1}}}, []Member{{"c", map[string]int{"Normal": 1}}})
	noFinish["expectedSeq"] = 2
	h.Fail(finishLiveMatch(h, owner, g, id, noFinish), 400, "matchDtoValidationFailed")
	oneTeam := map[string]any{"expectedSeq": 2, "teams": []any{finishBody(g, 2)["teams"].([]any)[0]}}
	h.Fail(finishLiveMatch(h, owner, g, id, oneTeam), 400, "matchWrongAmountOfTeams")
	h.Fail(finishLiveMatch(h, owner, g, id, map[string]any{"expectedSeq": 2}), 400, "matchDtoValidationFailed")
	noSeq := finishBody(g, 2)
	delete(noSeq, "expectedSeq")
	h.Fail(finishLiveMatch(h, owner, g, id, noSeq), 400, "matchDtoValidationFailed")

	// not in this group
	h.Fail(finishLiveMatch(h, owner, other, id, finishBody(g, 2)), 404, "liveMatchNotFound")
	h.Fail(finishLiveMatch(h, owner, g, newLiveMatchID(), finishBody(g, 2)), 404, "liveMatchNotFound")

	// none of that created a match or ended anything
	h.Equal(seasonMatchIDs(h, owner, g), []any{}, "no match")
	h.Equal(h.OK(getLiveMatchQuiet(h, owner, g, id)).Str("status"), "IN_PROGRESS", "still in progress")
	ws.ExpectNone()

	// and the live match can still be finished
	finished := h.OK(finishLiveMatch(h, owner, g, id, finishBody(g, 2)))
	h.Equal(finished.Str("status"), "FINISHED", "finished after the failures")
	h.Equal(len(seasonMatchIDs(h, owner, g)), 1, "one match")
}

func TestLiveMatchFinishAfterSeasonEnded(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live finish season", "a", "c")
	id := newLiveMatchID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "c")))
	oldSeason := g.SeasonID
	h.StartSeason(g, "Old")

	h.Fail(finishLiveMatch(h, owner, g, id, finishBody(g, 1)), 403, "seasonAlreadyEnded")
	live := h.OK(getLiveMatchQuiet(h, owner, g, id))
	h.Equal(live.Str("status"), "IN_PROGRESS", "the user can still discard it")
	h.Equal(live.Str("seasonId"), oldSeason, "season")
	h.Equal(h.OK(abandonLiveMatch(h, owner, g, id)).Str("status"), "ABANDONED", "discarded")
}

func TestLiveMatchAbandon(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live abandon", "a", "c")
	id := newLiveMatchID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "c"), adjustMove(g, "a", 1)))
	ws := h.Listen(g.ID)

	abandoned := h.OK(abandonLiveMatchRecorded(h, owner, g, id))
	h.Equal(abandoned.Str("status"), "ABANDONED", "status")
	h.True(abandoned.Str("endedAt") != "", "endedAt")
	h.Equal(abandoned.Data("resultMatchId"), nil, "no result match")
	h.Equal(len(abandoned.List("ops")), 2, "the answer keeps the ops")
	ev := ws.Expect(1)
	h.Equal(EventType(ev[0]), "LIVE_MATCHES", "event type")
	h.Equal(EventScope(ev[0]), "liveMatchEnd", "event scope")
	h.Equal(Get(ev[0], "body", "status"), "ABANDONED", "event status")
	h.Equal(Get(ev[0], "body", "ops"), []any{}, "end event has no ops")

	// idempotent: same answer, no second event
	h.Equal(h.OK(abandonLiveMatch(h, owner, g, id)).Data(), abandoned.Data(), "second abandon")
	ws.ExpectNone()
	h.Equal(h.OK(getLiveMatchQuiet(h, owner, g, id)).Data(), abandoned.Data(), "GET shows the end state")

	// nothing else works on it any more
	h.Fail(appendLiveOps(h, owner, g, id, adjustMove(g, "a", 1)), 409, "liveMatchEnded")
	h.Fail(finishLiveMatch(h, owner, g, id, finishBody(g, 2)), 409, "liveMatchEnded")
	h.Equal(seasonMatchIDs(h, owner, g), []any{}, "no match")
	ws.ExpectNone()

	h.Fail(abandonLiveMatch(h, owner, g, newLiveMatchID()), 404, "liveMatchNotFound")
	other := h.NewGroup(owner, "Live abandon other", "x")
	h.Fail(abandonLiveMatch(h, owner, other, id), 404, "liveMatchNotFound")
}

func TestLiveMatchListExcludesEnded(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live list ended", "a", "c")
	running, finished, abandoned := newLiveMatchID(), newLiveMatchID(), newLiveMatchID()
	for _, id := range []string{running, finished, abandoned} {
		h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "c")))
	}
	h.Equal(len(h.OK(listLiveMatches(h, owner, g)).List()), 3, "three running")

	h.OK(finishLiveMatch(h, owner, g, finished, finishBody(g, 1)))
	h.OK(abandonLiveMatch(h, owner, g, abandoned))

	list := h.OK(listLiveMatches(h, owner, g))
	h.Equal(len(list.List()), 1, "only the running one")
	h.Equal(list.Str("0", "id"), running, "running match")
	// ended ones are still readable by id
	h.Equal(h.OK(getLiveMatchQuiet(h, owner, g, finished)).Str("status"), "FINISHED", "finished by id")
	h.Equal(h.OK(getLiveMatchQuiet(h, owner, g, abandoned)).Str("status"), "ABANDONED", "abandoned by id")
}

// A finished live match keeps working when its match is deleted later: the
// link is cleared, the live match stays FINISHED and finishing again is a no-op.
func TestLiveMatchSurvivesDeletedResultMatch(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live deleted match", "a", "c")
	id := newLiveMatchID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "c")))
	finished := h.OK(finishLiveMatch(h, owner, g, id, finishBody(g, 1)))
	matchID := finished.Str("resultMatchId")

	h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/matches/" + matchID), Auth: owner.Bearer(), Skip: true}))
	ws := h.Listen(g.ID)

	live := h.OK(getLiveMatchQuiet(h, owner, g, id))
	h.Equal(live.Str("status"), "FINISHED", "status")
	h.Equal(live.Data("resultMatchId"), nil, "link cleared")
	again := h.OK(finishLiveMatch(h, owner, g, id, finishBody(g, 1)))
	h.Equal(again.Data(), live.Data(), "finish after the match was deleted")
	h.Equal(seasonMatchIDs(h, owner, g), []any{}, "no new match")
	h.Equal(h.OK(abandonLiveMatch(h, owner, g, id)).Str("status"), "FINISHED", "abandon")
	ws.ExpectNone()
}

// Live matches have no photos: a savePhoto in the finish body creates no
// upload (its URLs would never reach the finishing phone).
func TestLiveMatchFinishIgnoresSavePhoto(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live finish photo", "a", "c")
	id := newLiveMatchID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "c")))
	ws := h.Listen(g.ID)

	body := finishBody(g, 1)
	for _, team := range body["teams"].([]any) {
		team.(map[string]any)["savePhoto"] = true
	}
	h.OK(finishLiveMatch(h, owner, g, id, body))

	ev := ws.Expect(2)
	h.Equal(EventScope(ev[0]), "matchCreate", "event scope")
	uploads, _ := Get(ev[0], "body", "photoUploads").([]any)
	h.Equal(len(uploads), 0, "photo uploads")
}
