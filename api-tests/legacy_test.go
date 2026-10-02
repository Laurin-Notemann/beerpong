package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

// Most production rows predate accounts and have no creator. Every read path
// has to render them with null creator ids.
func TestLegacyRowsWithoutCreator(t *testing.T) {
	h := New(t)
	db := h.DB()
	owner := h.NewUser()
	g := h.NewGroup(owner, "Legacy", "a", "b")
	match := h.OK(h.CreateMatch(owner, g, []Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", map[string]int{"Normal": 1}}}))

	h.Exec(db, "UPDATE matches SET created_by = NULL WHERE id = $1", match.Str("id"))
	h.Exec(db, "UPDATE rules SET created_by = NULL WHERE season_id = $1", g.SeasonID)
	h.Exec(db, "UPDATE profiles SET created_by = NULL WHERE group_id = $1", g.ID)
	h.Exec(db, "UPDATE seasons SET created_by = NULL WHERE group_id = $1", g.ID)
	h.Exec(db, "UPDATE groups SET created_by = NULL WHERE id = $1", g.ID)

	h.Equal(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/" + match.Str("id")), Auth: owner.Bearer()})).Data("createdById"), nil, "match creator")
	h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches"), Auth: owner.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/extended"), Auth: owner.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/overview"), Auth: owner.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rules"), Auth: owner.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: g.Path("/profiles"), Auth: owner.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons"), Auth: owner.Bearer()}))
	h.Equal(h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: owner.Bearer()})).Data("createdById"), nil, "group creator")
	h.OK(h.Do(Req{Method: "GET", Path: "/groups/user", Auth: owner.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=all-time"), Auth: owner.Bearer()}))

	// a season started on legacy data still closes the old season and copies its rules
	h.StartSeason(g, "Legacy season")
	h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rules"), Auth: owner.Bearer()}))
}
