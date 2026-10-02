package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestPlayersAndDelete(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Players", "a", "b", "c")
	other := h.NewGroup(owner, "Other", "z")
	ws := h.Listen(g.ID)

	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players"), Auth: owner.Bearer()})).List()), 3, "active players")

	res := h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + g.Players["c"]), Auth: owner.Bearer()}))
	h.Equal(res.Data(), "OK", "deleted")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "playerDelete", "delete event")
	h.Equal(EventType(ev[0]), "PLAYERS", "event type")
	// the event carries the player as it was before deletion
	h.Equal(Get(ev[0], "body", "activeThisSeason"), true, "event body before deactivation")

	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players"), Auth: owner.Bearer()})).List()), 2, "active players after delete")
	all := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players?showInactive=true"), Auth: owner.Bearer()}))
	h.Equal(len(all.List()), 3, "all players")
	h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players?showInactive=false"), Auth: owner.Bearer()}))
	h.SpringError(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players?showInactive=maybe"), Auth: owner.Bearer()}), 400, "Bad Request", g.SeasonPath("/players"))

	// extended players are leaderboard entries, which never include inactive players
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players/extended"), Auth: owner.Bearer()})).List()), 2, "extended active")
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players/extended?showInactive=true"), Auth: owner.Bearer()})).List()), 2, "extended with inactive")

	h.Fail(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + g.Players["c"]), Auth: owner.Bearer()}), 403, "playerAlreadyDeleted")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/nope"), Auth: owner.Bearer()}), 404, "playerNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + other.Players["z"]), Auth: owner.Bearer()}), 400, "playerNotOfGroup")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/seasons/" + other.SeasonID + "/players/" + g.Players["a"]), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + other.SeasonID + "/players"), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + other.SeasonID + "/players/extended"), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")
	ws.ExpectNone()

	oldSeason := g.SeasonID
	oldPlayer := g.Players["a"]
	h.StartSeason(g, "Old")
	ws.Expect(1)
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/seasons/" + oldSeason + "/players/" + oldPlayer), Auth: owner.Bearer()}), 403, "seasonAlreadyEnded")
	// the season in the path is only checked against the group
	h.OK(h.Do(Req{Method: "DELETE", Path: g.Path("/seasons/" + oldSeason + "/players/" + g.Players["b"]), Auth: owner.Bearer()}))
	ws.Expect(1)
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + oldSeason + "/players/extended"), Auth: owner.Bearer()})).List()), 2, "old season extended")
}

func TestExtendedPlayersWhenNoneActive(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Empty", "a")
	h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + g.Players["a"]), Auth: owner.Bearer()}))
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players"), Auth: owner.Bearer()})).List()), 0, "no active players")
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players/extended"), Auth: owner.Bearer()})).List()), 0, "no extended players")
	board := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}))
	h.Equal(board.Num("numPlayers"), 0, "empty board")
}
