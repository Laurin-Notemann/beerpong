package apitests

import (
	"crypto/rand"
	"fmt"
	"sync"
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func liveMatchPath(g *Group, suffix string) string { return g.Path("/live-matches" + suffix) }

type op = map[string]any

func setTeams(g *Group, red, blue string) op {
	return op{"id": newUUID(), "type": "SET_TEAMS", "redPlayerIds": []string{g.Players[red]}, "bluePlayerIds": []string{g.Players[blue]}}
}

func adjustMove(g *Group, player string, delta int) op {
	return op{"id": newUUID(), "type": "ADJUST_MOVE", "playerId": g.Players[player], "moveId": g.Moves["Normal"], "delta": delta}
}

func createBody(g *Group, ops ...op) map[string]any {
	return map[string]any{"seasonId": g.SeasonID, "ops": ops}
}

func putLiveMatch(h *H, u *User, g *Group, id string, ops ...op) *Resp {
	h.Helper()
	return h.Do(Req{Method: "PUT", Path: liveMatchPath(g, "/"+id), Auth: u.Bearer(), Body: createBody(g, ops...), Ordered: true})
}

func appendLiveOps(h *H, u *User, g *Group, id string, ops ...op) *Resp {
	h.Helper()
	return h.Do(Req{Method: "POST", Path: liveMatchPath(g, "/"+id+"/ops"), Auth: u.Bearer(), Body: map[string]any{"ops": ops}, Ordered: true})
}

func getLiveMatch(h *H, u *User, g *Group, id string) *Resp {
	h.Helper()
	return h.Do(Req{Method: "GET", Path: liveMatchPath(g, "/"+id), Auth: u.Bearer(), Ordered: true})
}

func listLiveMatches(h *H, u *User, g *Group) *Resp {
	h.Helper()
	return h.Do(Req{Method: "GET", Path: liveMatchPath(g, ""), Auth: u.Bearer(), Ordered: true})
}

func seqs(list []any) []any {
	out := []any{}
	for _, o := range list {
		out = append(out, Get(o, "seq"))
	}
	return out
}

func TestLiveMatchCreateAndGet(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live create", "a", "b", "c", "d")
	ws := h.Listen(g.ID)

	id := newUUID()
	first := setTeams(g, "a", "b")
	created := h.OK(putLiveMatch(h, owner, g, id, first, adjustMove(g, "a", 1)))
	h.Equal(created.Str("id"), id, "id")
	h.Equal(created.Str("groupId"), g.ID, "group")
	h.Equal(created.Str("seasonId"), g.SeasonID, "season")
	h.Equal(created.Str("status"), "IN_PROGRESS", "status")
	h.Equal(created.Str("createdByUserId"), owner.ID, "creator")
	h.Equal(created.Num("lastSeq"), 2, "lastSeq")
	h.Equal(created.Data("endedAt"), nil, "endedAt")
	h.Equal(created.Data("resultMatchId"), nil, "resultMatchId")
	h.True(created.Str("startedAt") != "" && created.Str("lastActivityAt") != "", "dates")
	h.Equal(seqs(created.List("ops")), []any{1.0, 2.0}, "seqs")
	h.Equal(created.Str("ops", "0", "id"), first["id"], "first op id")
	h.Equal(created.Str("ops", "0", "type"), "SET_TEAMS", "first op type")
	h.Equal(created.Data("ops", "0", "redPlayerIds"), []any{g.Players["a"]}, "red players")
	h.Equal(created.Data("ops", "0", "bluePlayerIds"), []any{g.Players["b"]}, "blue players")
	h.Equal(created.Data("ops", "0", "playerId"), nil, "fields of other types are null")
	h.Equal(created.Num("ops", "1", "delta"), 1, "delta")
	h.True(created.Str("ops", "1", "createdAt") != "", "op createdAt")

	// the start event carries the full live match
	ev := ws.Expect(1)
	h.Equal(EventType(ev[0]), "LIVE_MATCHES", "event type")
	h.Equal(EventScope(ev[0]), "liveMatchStart", "event scope")
	h.Equal(Get(ev[0], "body", "id"), id, "event body")
	h.Equal(Get(ev[0], "body", "lastSeq"), 2.0, "event lastSeq")
	h.Equal(len(Get(ev[0], "body", "ops").([]any)), 2, "event ops")

	// repeating the create returns the same match, adds nothing and announces nothing
	again := h.OK(putLiveMatch(h, owner, g, id, first, adjustMove(g, "b", 5)))
	h.Equal(again.Data(), created.Data(), "repeated PUT")
	h.Equal(len(again.List("ops")), 2, "ops after repeated PUT")
	ws.ExpectNone()

	fetched := h.OK(getLiveMatch(h, owner, g, id))
	h.Equal(fetched.Data(), created.Data(), "GET")
}

func TestLiveMatchCreateValidation(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live create validation", "a", "b")
	other := h.NewGroup(owner, "Live create other", "z")
	ws := h.Listen(g.ID)

	h.Fail(putLiveMatch(h, owner, g, "not-a-uuid", setTeams(g, "a", "b")), 400, "liveMatchInvalidOps")
	badOpID := setTeams(g, "a", "b")
	badOpID["id"] = "nope"
	h.Fail(putLiveMatch(h, owner, g, newUUID(), badOpID), 400, "liveMatchInvalidOps")
	h.Fail(h.Do(Req{Method: "PUT", Path: liveMatchPath(g, "/"+newUUID()), Auth: owner.Bearer(), Body: map[string]any{"ops": []op{}}}), 400, "liveMatchInvalidOps")
	h.Fail(h.Do(Req{Method: "PUT", Path: liveMatchPath(g, "/"+newUUID()), Auth: owner.Bearer(), Body: map[string]any{"seasonId": g.SeasonID}}), 400, "liveMatchInvalidOps")
	unknownType := liveMatchPath(g, "/"+newUUID())
	h.SpringError(h.Do(Req{Method: "PUT", Path: unknownType, Auth: owner.Bearer(), ContentType: "application/json", RawBody: ptr(`{"seasonId":"` + g.SeasonID + `","ops":[{"id":"` + newUUID() + `","type":"NOPE"}]}`)}), 400, "Bad Request", unknownType)
	h.Fail(h.Do(Req{Method: "PUT", Path: liveMatchPath(g, "/"+newUUID()), Auth: owner.Bearer(), Body: map[string]any{"seasonId": newUUID(), "ops": []op{setTeams(g, "a", "b")}}}), 404, "seasonNotFound")
	h.Fail(h.Do(Req{Method: "PUT", Path: liveMatchPath(g, "/"+newUUID()), Auth: owner.Bearer(), Body: map[string]any{"seasonId": other.SeasonID, "ops": []op{setTeams(g, "a", "b")}}}), 404, "seasonHasDifferentGroup")

	oldSeason := g.SeasonID
	h.StartSeason(g, "Old")
	ws.Expect(1)
	h.Fail(h.Do(Req{Method: "PUT", Path: liveMatchPath(g, "/"+newUUID()), Auth: owner.Bearer(), Body: map[string]any{"seasonId": oldSeason, "ops": []op{setTeams(g, "a", "b")}}}), 403, "seasonAlreadyEnded")

	// none of the rejected calls created anything
	h.Equal(len(h.OK(listLiveMatches(h, owner, g)).List()), 0, "no live matches")
	ws.ExpectNone()
}

func TestLiveMatchConcurrentCreate(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live concurrent", "a", "b")
	ws := h.Listen(g.ID)

	id := newUUID()
	body := createBody(g, setTeams(g, "a", "b"))
	const n = 8
	results := make([]*Resp, n)
	var wg sync.WaitGroup
	for i := range results {
		wg.Add(1)
		go func() {
			defer wg.Done()
			results[i] = h.Do(Req{Method: "PUT", Path: liveMatchPath(g, "/"+id), Auth: owner.Bearer(), Body: body, Skip: true})
		}()
	}
	wg.Wait()
	for _, r := range results {
		h.OK(r)
		h.Equal(r.Num("lastSeq"), 1, "lastSeq")
		h.Equal(len(r.List("ops")), 1, "ops")
		h.Equal(r.Data(), results[0].Data(), "identical responses")
	}

	// only the create that won announces the match
	ws.Expect(1)
	ws.ExpectNone()
	h.Equal(len(h.OK(listLiveMatches(h, owner, g)).List()), 1, "one live match")
}

func TestLiveMatchAppend(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live append", "a", "b")
	id := newUUID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "b")))
	ws := h.Listen(g.ID)

	first := h.OK(appendLiveOps(h, owner, g, id, adjustMove(g, "a", 2), adjustMove(g, "b", -1)))
	h.Equal(first.Num("lastSeq"), 3, "lastSeq")
	h.Equal(seqs(first.List("ops")), []any{2.0, 3.0}, "seqs")
	ev := ws.Expect(1)
	h.Equal(EventType(ev[0]), "LIVE_MATCHES", "event type")
	h.Equal(EventScope(ev[0]), "liveMatchOps", "event scope")
	h.Equal(Get(ev[0], "body", "liveMatchId"), id, "event live match")
	h.Equal(Get(ev[0], "body", "lastSeq"), 3.0, "event lastSeq")
	h.Equal(seqs(Get(ev[0], "body", "ops").([]any)), []any{2.0, 3.0}, "event seqs")

	// ops keep only the fields of their type
	hit := op{"id": newUUID(), "type": "RECORD_CUP_HIT", "team": "blue", "playerId": g.Players["a"], "moveId": g.Moves["Normal"], "finishMoveId": g.Moves["Finish - Normal"],
		"cups": []op{{"x": 0, "y": 0}, {"x": 9, "y": 3}}, "delta": 4, "redPlayerIds": []string{g.Players["a"]}}
	undo := op{"id": newUUID(), "type": "UNDO_CUP_HIT", "team": "blue", "cup": op{"x": 9, "y": 3}}
	remove := op{"id": newUUID(), "type": "SET_PLAYER_TEAM", "playerId": g.Players["b"]}
	res := h.OK(appendLiveOps(h, owner, g, id, hit, undo, remove))
	h.Equal(seqs(res.List("ops")), []any{4.0, 5.0, 6.0}, "seqs")
	h.Equal(res.Data("ops", "0", "cups"), []any{op{"x": 0.0, "y": 0.0}, op{"x": 9.0, "y": 3.0}}, "cups")
	h.Equal(res.Str("ops", "0", "finishMoveId"), g.Moves["Finish - Normal"], "finish move")
	h.Equal(res.Data("ops", "0", "delta"), nil, "delta is not part of a cup hit")
	h.Equal(res.Data("ops", "0", "redPlayerIds"), nil, "team lists are not part of a cup hit")
	h.Equal(res.Data("ops", "1", "cup"), op{"x": 9.0, "y": 3.0}, "undone cup")
	h.Equal(res.Data("ops", "2", "team"), nil, "removal has no team")
	h.Equal(res.Str("ops", "2", "playerId"), g.Players["b"], "removed player")
	ev = ws.Expect(1)
	h.Equal(Get(ev[0], "body", "lastSeq"), 6.0, "event lastSeq")
	h.Equal(Get(ev[0], "body", "ops", "0", "delta"), nil, "broadcast keeps only the op's fields")

	stored := h.OK(getLiveMatch(h, owner, g, id))
	h.Equal(seqs(stored.List("ops")), []any{1.0, 2.0, 3.0, 4.0, 5.0, 6.0}, "gapless log")
	h.Equal(stored.Num("lastSeq"), 6, "stored lastSeq")
	h.Equal(stored.Data("ops", "3"), res.Data("ops", "0"), "stored op equals the appended one")
}

func TestLiveMatchAppendIsIdempotentPerOpID(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live retry", "a", "b")
	id := newUUID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "b")))
	ws := h.Listen(g.ID)

	sent := adjustMove(g, "a", 3)
	h.OK(appendLiveOps(h, owner, g, id, sent))
	ws.Expect(1)

	// a retry returns the stored op with its seq; only the new op gets one
	fresh := adjustMove(g, "b", 1)
	retry := h.OK(appendLiveOps(h, owner, g, id, sent, fresh))
	h.Equal(retry.Num("lastSeq"), 3, "lastSeq")
	h.Equal(seqs(retry.List("ops")), []any{2.0, 3.0}, "seqs")
	h.Equal(retry.Str("ops", "0", "id"), sent["id"], "retried op")
	h.Equal(retry.Str("ops", "1", "id"), fresh["id"], "new op")
	ev := ws.Expect(1)
	h.Equal(seqs(Get(ev[0], "body", "ops").([]any)), []any{3.0}, "event has only the new op")

	// a request with nothing new returns the stored ops and announces nothing
	only := h.OK(appendLiveOps(h, owner, g, id, sent))
	h.Equal(only.Num("lastSeq"), 3, "lastSeq")
	h.Equal(seqs(only.List("ops")), []any{2.0}, "seqs")
	ws.ExpectNone()

	// the same id twice in one request is appended once
	dup := adjustMove(g, "a", 1)
	twice := h.OK(appendLiveOps(h, owner, g, id, dup, dup))
	h.Equal(twice.Num("lastSeq"), 4, "lastSeq")
	h.Equal(len(twice.List("ops")), 1, "ops")
	ws.Expect(1)

	h.Equal(len(h.OK(getLiveMatch(h, owner, g, id)).List("ops")), 4, "stored ops")
}

func TestLiveMatchInvalidOpsAppendNothing(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live invalid", "a", "b")
	id := newUUID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "b")))
	ws := h.Listen(g.ID)

	valid := adjustMove(g, "a", 1)
	invalid := map[string]op{
		"delta 0":        adjustMove(g, "a", 0),
		"delta 21":       adjustMove(g, "a", 21),
		"missing player": {"id": newUUID(), "type": "ADJUST_MOVE", "moveId": g.Moves["Normal"], "delta": 1},
		"x is 10":        {"id": newUUID(), "type": "UNDO_CUP_HIT", "team": "red", "cup": op{"x": 10, "y": 0}},
		"no cups":        {"id": newUUID(), "type": "RECORD_CUP_HIT", "team": "red", "playerId": g.Players["a"], "moveId": g.Moves["Normal"], "cups": []op{}},
		"green team":     {"id": newUUID(), "type": "SET_PLAYER_TEAM", "playerId": g.Players["a"], "team": "green"},
		"op id not uuid": {"id": "nope", "type": "ADJUST_MOVE", "playerId": g.Players["a"], "moveId": g.Moves["Normal"], "delta": 1},
		"no type":        {"id": newUUID(), "playerId": g.Players["a"], "moveId": g.Moves["Normal"], "delta": 1},
	}
	for _, name := range []string{"delta 0", "delta 21", "missing player", "x is 10", "no cups", "green team", "op id not uuid", "no type"} {
		// the valid op in front must not be appended either
		h.Fail(appendLiveOps(h, owner, g, id, valid, invalid[name]), 400, "liveMatchInvalidOps")
	}
	tooMany := make([]op, 51)
	for i := range tooMany {
		tooMany[i] = adjustMove(g, "a", 1)
	}
	h.Fail(appendLiveOps(h, owner, g, id, tooMany...), 400, "liveMatchInvalidOps")
	h.Fail(h.Do(Req{Method: "POST", Path: liveMatchPath(g, "/"+id+"/ops"), Auth: owner.Bearer(), Body: map[string]any{}}), 400, "liveMatchInvalidOps")
	h.SpringError(h.Do(Req{Method: "POST", Path: liveMatchPath(g, "/"+id+"/ops"), Auth: owner.Bearer(), ContentType: "application/json", RawBody: ptr(`{"ops":[{"id":"` + newUUID() + `","type":"NOPE"}]}`)}), 400, "Bad Request", liveMatchPath(g, "/"+id+"/ops"))

	// 50 is the limit
	fifty := make([]op, 50)
	for i := range fifty {
		fifty[i] = adjustMove(g, "a", 1)
	}
	fiftyOps := h.OK(appendLiveOps(h, owner, g, id, fifty...))
	h.Equal(fiftyOps.Num("lastSeq"), 51, "lastSeq after 50 ops")
	ws.Expect(1)

	stored := h.OK(getLiveMatch(h, owner, g, id))
	h.Equal(len(stored.List("ops")), 51, "only the 50 valid ops and the first were stored")
	ws.ExpectNone()
}

func TestLiveMatchOpLimit(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live limit", "a", "b")
	id := newUUID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "b")))

	batch := func(n int) []op {
		ops := make([]op, n)
		for i := range ops {
			ops[i] = adjustMove(g, "a", 1)
		}
		return ops
	}
	// 1 + 39 * 50 = 1951 ops
	for i := 0; i < 39; i++ {
		h.OK(h.Do(Req{Method: "POST", Path: liveMatchPath(g, "/"+id+"/ops"), Auth: owner.Bearer(), Body: map[string]any{"ops": batch(50)}, Skip: true}))
	}
	h.Equal(h.OK(getLiveMatch(h, owner, g, id)).Num("lastSeq"), 1951, "lastSeq")

	h.Fail(appendLiveOps(h, owner, g, id, batch(50)...), 400, "liveMatchTooManyOps")
	h.Equal(h.OK(getLiveMatch(h, owner, g, id)).Num("lastSeq"), 1951, "nothing was appended")
	// exactly the remaining 49 still fit
	h.Equal(h.OK(appendLiveOps(h, owner, g, id, batch(49)...)).Num("lastSeq"), 2000, "lastSeq at the limit")
	h.Fail(appendLiveOps(h, owner, g, id, batch(1)...), 400, "liveMatchTooManyOps")
}

func TestLiveMatchList(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live list", "a", "b")
	other := h.NewGroup(owner, "Live list other", "x", "y")

	h.Equal(len(h.OK(listLiveMatches(h, owner, g)).List()), 0, "empty list")

	older, newer := newUUID(), newUUID()
	h.OK(putLiveMatch(h, owner, g, older, setTeams(g, "a", "b")))
	h.OK(putLiveMatch(h, owner, g, newer, setTeams(g, "a", "b")))
	h.OK(putLiveMatch(h, owner, other, newUUID(), setTeams(other, "x", "y")))

	// the most recently active one comes first
	h.OK(appendLiveOps(h, owner, g, older, adjustMove(g, "a", 1)))
	list := h.OK(listLiveMatches(h, owner, g))
	h.Equal(len(list.List()), 2, "this group's live matches")
	h.Equal(list.Str("0", "id"), older, "most recently active first")
	h.Equal(list.Str("1", "id"), newer, "then the other")
	h.Equal(len(list.List("0", "ops")), 2, "ops are included")
	h.Equal(len(list.List("1", "ops")), 1, "ops are included")
	h.Equal(list.Str("0", "groupId"), g.ID, "group")
	h.Equal(len(h.OK(listLiveMatches(h, owner, other)).List()), 1, "other group")
}

func TestLiveMatchOfAnotherGroupIsNotFound(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live isolation", "a", "b")
	other := h.NewGroup(owner, "Live isolation other", "x", "y")
	id := newUUID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "b")))

	h.Fail(getLiveMatch(h, owner, other, id), 404, "liveMatchNotFound")
	h.Fail(appendLiveOps(h, owner, other, id, adjustMove(other, "x", 1)), 404, "liveMatchNotFound")
	h.Fail(putLiveMatch(h, owner, other, id, setTeams(other, "x", "y")), 404, "liveMatchNotFound")
	h.Fail(getLiveMatch(h, owner, g, newUUID()), 404, "liveMatchNotFound")
	h.Fail(appendLiveOps(h, owner, g, newUUID(), adjustMove(g, "a", 1)), 404, "liveMatchNotFound")

	// an op id of another live match is not a retry
	second := newUUID()
	first := setTeams(g, "a", "b")
	h.OK(putLiveMatch(h, owner, g, newUUID(), first))
	h.OK(putLiveMatch(h, owner, g, second, setTeams(g, "a", "b")))
	h.Fail(appendLiveOps(h, owner, g, second, first), 400, "liveMatchInvalidOps")
	h.Fail(putLiveMatch(h, owner, g, newUUID(), first), 400, "liveMatchInvalidOps")

	h.Equal(h.OK(getLiveMatch(h, owner, g, id)).Num("lastSeq"), 1, "left untouched")
	h.Equal(h.OK(getLiveMatch(h, owner, g, second)).Num("lastSeq"), 1, "left untouched")
	h.Equal(len(h.OK(listLiveMatches(h, owner, g)).List()), 3, "the rejected create left nothing behind")
}

func TestLiveMatchRequiresMembership(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live membership", "a", "b")
	stranger := h.NewUser()
	id := newUUID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "b")))

	h.Unauthorized(getLiveMatch(h, stranger, g, id), "No access to this group!")
	h.Unauthorized(listLiveMatches(h, stranger, g), "No access to this group!")
	h.Unauthorized(putLiveMatch(h, stranger, g, newUUID(), setTeams(g, "a", "b")), "No access to this group!")
	h.Unauthorized(appendLiveOps(h, stranger, g, id, adjustMove(g, "a", 1)), "No access to this group!")

	// a member who is not the creator can append
	h.Join(stranger, g)
	h.OK(appendLiveOps(h, stranger, g, id, adjustMove(g, "a", 1)))
}

func ptr[T any](v T) *T { return &v }
