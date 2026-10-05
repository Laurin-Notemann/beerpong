package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func putDisplay(h *H, u *User, g *Group, id string, body map[string]any) *Resp {
	h.Helper()
	return h.Do(Req{Method: "PUT", Path: liveMatchPath(g, "/"+id+"/display"), Auth: u.Bearer(), Body: body, Ordered: true})
}

func display(seq int, blue, red int) map[string]any {
	return map[string]any{"seq": seq, "blueNames": "Anna & Ben", "blueScore": blue, "redNames": "Cleo", "redScore": red}
}

// A phone's score of a live match is kept only if it was computed at the
// newest op; it's what Live Activities and widgets show, not a socket event.
func TestLiveMatchDisplay(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Live display", "a", "b")
	id := newLiveMatchID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "b"), adjustMove(g, "a", 1)))
	ws := h.Listen(g.ID)

	h.Equal(h.OK(putDisplay(h, owner, g, id, display(2, 1, 0))).Data("accepted"), true, "at the newest op")
	h.Equal(h.OK(putDisplay(h, owner, g, id, display(2, 1, 0))).Data("accepted"), true, "the same again")
	h.Equal(h.OK(putDisplay(h, owner, g, id, display(1, 0, 0))).Data("accepted"), false, "behind")

	h.OK(appendLiveOps(h, owner, g, id, adjustMove(g, "b", 1)))
	ws.Expect(1) // the ops
	h.Equal(h.OK(putDisplay(h, owner, g, id, display(2, 1, 0))).Data("accepted"), false, "behind the new op")
	h.Equal(h.OK(putDisplay(h, owner, g, id, display(3, 1, 1))).Data("accepted"), true, "caught up")
	h.Equal(h.OK(putDisplay(h, owner, g, id, display(4, 1, 1))).Data("accepted"), false, "ahead of the server")
	ws.ExpectNone()

	h.Fail(putDisplay(h, owner, g, id, map[string]any{"seq": 3, "blueScore": 1, "redScore": 1}), 400, "liveMatchInvalidDisplay")
	h.Fail(putDisplay(h, owner, g, id, display(3, -1, 1)), 400, "liveMatchInvalidDisplay")
	h.Fail(putDisplay(h, owner, g, newLiveMatchID(), display(1, 0, 0)), 404, "liveMatchNotFound")

	h.OK(abandonLiveMatch(h, owner, g, id))
	h.Equal(h.OK(putDisplay(h, owner, g, id, display(3, 2, 1))).Data("accepted"), false, "after the end")
}

// A phone stores its push tokens; null forgets one.
func TestPushTokens(t *testing.T) {
	h := New(t)
	u := h.NewUser()
	put := func(body map[string]any) *Resp {
		h.Helper()
		return h.Do(Req{Method: "PUT", Path: "/groups/user/push-tokens", Auth: u.Bearer(), Body: body, Ordered: true})
	}

	both := h.OK(put(map[string]any{"deviceToken": "a1b2c3", "activityStartToken": "d4e5f6"}))
	h.Equal(both.Data("deviceToken"), "a1b2c3", "device token")
	h.Equal(both.Data("activityStartToken"), "d4e5f6", "activity start token")

	off := h.OK(put(map[string]any{"deviceToken": "a1b2c3", "activityStartToken": nil}))
	h.Equal(off.Data("activityStartToken"), nil, "Live Activities off")

	h.Fail(put(map[string]any{"deviceToken": "not hex", "activityStartToken": nil}), 400, "invalidPushToken")
	h.Fail(put(map[string]any{"deviceToken": "", "activityStartToken": nil}), 400, "invalidPushToken")
	h.True(h.Do(Req{Method: "PUT", Path: "/groups/user/push-tokens", Body: map[string]any{}}).Status == 401, "needs a user")
}
