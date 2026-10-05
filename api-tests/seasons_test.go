package apitests

import (
	"strings"
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestGetSeasons(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Seasons", "a")
	other := h.NewGroup(owner, "Other", "z")

	season := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + g.SeasonID), Auth: owner.Bearer()}))
	h.Equal(season.Str("groupId"), g.ID, "season group")
	h.Equal(season.Data("name"), nil, "active season has no name")
	h.Equal(season.Data("endDate"), nil, "active season has no end")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + other.SeasonID), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/seasons/nope"), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")
}

func TestUpdateSeasonSettings(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Settings", "a")
	ws := h.Listen(g.ID)
	put := func(body any) *Resp {
		return h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + g.SeasonID), Auth: owner.Bearer(), Body: body})
	}

	res := h.OK(put(map[string]any{"seasonSettings": map[string]any{"wakeTime": "08:30", "rankingAlgorithm": "ELO", "dailyLeaderboard": "LAST_24_HOURS", "minMatchesToQualify": 3}}))
	h.Equal(res.Str("seasonSettings", "wakeTime"), "08:30:00", "wake time")
	h.Equal(res.Str("seasonSettings", "rankingAlgorithm"), "ELO", "ranking")
	h.Equal(res.Str("seasonSettings", "dailyLeaderboard"), "LAST_24_HOURS", "daily")
	h.Equal(res.Num("seasonSettings", "minMatchesToQualify"), 3, "min matches")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "seasonUpdate", "season event")
	h.Equal(EventType(ev[0]), "SEASONS", "season event type")

	// A settings object without wakeTime resets it to 00:00 (the DTO default).
	res = h.OK(put(map[string]any{"seasonSettings": map[string]any{"maxTeamSize": 4}}))
	h.Equal(res.Str("seasonSettings", "wakeTime"), "00:00:00", "wake time reset by omission")
	h.Equal(res.Num("seasonSettings", "maxTeamSize"), 4, "max team size")
	h.Equal(res.Str("seasonSettings", "rankingAlgorithm"), "ELO", "ranking kept")
	ws.Expect(1)

	// An explicit null keeps the stored wake time.
	h.OK(put(map[string]any{"seasonSettings": map[string]any{"wakeTime": "06:15"}}))
	ws.Expect(1)
	res = h.OK(put(map[string]any{"seasonSettings": map[string]any{"wakeTime": nil, "minTeamSize": 2}}))
	h.Equal(res.Str("seasonSettings", "wakeTime"), "06:15:00", "explicit null keeps wake time")
	ws.Expect(1)

	// clamping
	res = h.OK(put(map[string]any{"seasonSettings": map[string]any{"minMatchesToQualify": -5, "minTeamSize": 0, "maxTeamSize": 20}}))
	h.Equal(res.Num("seasonSettings", "minMatchesToQualify"), 0, "min matches clamped")
	h.Equal(res.Num("seasonSettings", "minTeamSize"), 1, "min team size clamped")
	h.Equal(res.Num("seasonSettings", "maxTeamSize"), 10, "max team size clamped")
	ws.Expect(1)
	res = h.OK(put(map[string]any{"seasonSettings": map[string]any{"minMatchesToQualify": 5000, "minTeamSize": 12, "maxTeamSize": 15}}))
	h.Equal(res.Num("seasonSettings", "minMatchesToQualify"), 1000, "min matches clamped")
	h.Equal(res.Num("seasonSettings", "minTeamSize"), 10, "min team size clamped")
	ws.Expect(1)

	for _, wake := range []string{"25:00", "8:00", "08:00:00", "noon", "", "12:60"} {
		h.Fail(put(map[string]any{"seasonSettings": map[string]any{"wakeTime": wake}}), 400, "seasonWrongTimeFormat")
	}
	h.Fail(put(map[string]any{"seasonSettings": map[string]any{"minTeamSize": 5, "maxTeamSize": 3}}), 400, "seasonWrongTeamSizes")
	h.Fail(put(map[string]any{"seasonSettings": map[string]any{"minTeamSize": 11}}), 400, "seasonWrongTeamSizes")
	h.Fail(put(map[string]any{}), 400, "invalidSeasonDto")
	h.Fail(put(map[string]any{"seasonSettings": nil}), 400, "invalidSeasonDto")
	h.SpringError(put(map[string]any{"seasonSettings": map[string]any{"rankingAlgorithm": "GLICKO"}}), 400, "Bad Request", g.Path("/seasons/"+g.SeasonID))
	ws.ExpectNone()

	other := h.NewGroup(owner, "Other", "z")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + other.SeasonID), Auth: owner.Bearer(), Body: map[string]any{"seasonSettings": map[string]any{}}}), 404, "seasonHasDifferentGroup")

	old := g.SeasonID
	h.StartSeason(g, "First")
	ws.Expect(1)
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + old), Auth: owner.Bearer(), Body: map[string]any{"seasonSettings": map[string]any{}}}), 403, "seasonAlreadyEnded")
	// settings are carried over to the next season
	next := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + g.SeasonID), Auth: owner.Bearer()}))
	h.Equal(next.Num("seasonSettings", "minTeamSize"), 10, "min team size carried over")
	h.Equal(next.Str("seasonSettings", "rankingAlgorithm"), "ELO", "ranking carried over")
}

func TestStartSeasonValidation(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Season validation", "a")
	start := func(body map[string]any) *Resp {
		return h.Do(Req{Method: "PUT", Path: g.Path("/active-season"), Auth: owner.Bearer(), Body: body})
	}
	for _, name := range []any{nil, "", "  ", "x", strings.Repeat("y", 51)} {
		h.Fail(start(map[string]any{"oldSeasonName": name, "ruleMoves": DefaultBeerpongMoves()}), 400, "invalidSeasonName")
	}
	normal := map[string]any{"name": "Normal", "pointsForScorer": 1, "pointsForTeam": 0, "finishingMove": false}
	finish := map[string]any{"name": "Finish", "pointsForScorer": 1, "pointsForTeam": 3, "finishingMove": true}
	for _, moves := range []any{
		nil,
		[]any{},
		[]any{normal},
		[]any{finish},
		[]any{finish, map[string]any{"name": "Finish 2", "finishingMove": true}},
		[]any{normal, finish, map[string]any{"name": " ", "pointsForScorer": 1}},
		[]any{normal, finish, map[string]any{"name": "Neg", "pointsForTeam": -1}},
	} {
		h.Fail(start(map[string]any{"oldSeasonName": "Valid", "ruleMoves": moves}), 400, "invalidRuleMoves")
	}
	h.OK(start(map[string]any{"oldSeasonName": "ab", "ruleMoves": []any{normal, finish}}))
}

func TestStartSeasonCarriesPlayersRulesAndStats(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Season start", "a", "b", "c")
	ws := h.Listen(g.ID)
	oldSeason := g.SeasonID

	h.OK(h.CreateMatch(owner, g, []Member{{"a", map[string]int{"Normal": 3, "Finish - Normal": 1}}}, []Member{{"b", map[string]int{"Bomb": 1}}}))
	h.OK(h.CreateMatch(owner, g, []Member{{"b", map[string]int{"Normal": 1}}, {"c", map[string]int{"Finish - Ring of fire": 1}}}, []Member{{"a", map[string]int{"Normal": 5}}}))
	ws.Expect(2)
	h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + g.Players["c"]), Auth: owner.Bearer()}))
	ws.Expect(1)
	h.OK(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rules"), Auth: owner.Bearer(), Ordered: true, Body: []any{
		map[string]any{"title": "House rule", "description": "Be nice"},
	}}))
	ws.Expect(1)
	before := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + oldSeason), Auth: owner.Bearer()}))

	started := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/active-season"), Auth: owner.Bearer(), Body: map[string]any{
		"oldSeasonName": "Season One",
		"ruleMoves": []any{
			map[string]any{"name": "Cup", "pointsForScorer": 1, "pointsForTeam": 0, "finishingMove": false},
			map[string]any{"name": "Last cup", "pointsForScorer": 2, "pointsForTeam": 1, "finishingMove": true},
		},
	}}))
	newSeason := started.Str("id")
	h.True(newSeason != oldSeason, "new season id")
	h.Equal(started.Data("name"), nil, "new season is unnamed")
	h.Equal(started.Data("endDate"), nil, "new season is open")
	h.Equal(started.Str("groupId"), g.ID, "new season group")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "seasonStart", "season start event")
	h.Equal(Get(ev[0], "body", "oldSeason", "name"), "Season One", "event carries the closed season")
	h.Equal(Get(ev[0], "body", "newSeason", "id"), newSeason, "event carries the new season")

	ended := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + oldSeason), Auth: owner.Bearer()}))
	h.Equal(ended.Str("name"), "Season One", "old season named")
	h.True(ended.Data("endDate") != nil, "old season ended")

	group := h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: owner.Bearer()}))
	h.Equal(group.Str("activeSeasonId"), newSeason, "group points at new season")
	h.Reload(g)

	// rule moves come from the request, rules are copied
	h.Equal(len(g.Moves), 2, "rule moves of new season")
	rules := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rules"), Auth: owner.Bearer()}))
	h.Equal(len(rules.List()), 1, "rules copied")
	h.Equal(Get(rules.List()[0], "title"), "House rule", "copied rule")

	// only players active at the end of the season are carried over, with
	// their stats; the Elo starts over at 1500
	players := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players?showInactive=true"), Auth: owner.Bearer()}))
	h.Equal(len(players.List()), 2, "active players carried over")
	extended := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players/extended"), Auth: owner.Bearer()}))
	carried := map[string]any{}
	for _, p := range extended.List() {
		carried[Get(p, "profileId").(string)] = Get(p, "statistics")
	}
	for _, p := range before.List("entries") {
		profile := Get(p, "profileId").(string)
		want := Get(p, "statistics", "points")
		h.Equal(Get(carried[profile], "points"), want, "carried points for "+profile)
		h.Equal(Get(carried[profile], "elo"), 1500.0, "elo starts over every season for "+profile)
	}

	seasons := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons"), Auth: owner.Bearer()}))
	h.Equal(len(seasons.List()), 2, "two seasons")
	userGroups := h.OK(h.Do(Req{Method: "GET", Path: "/groups/user", Auth: owner.Bearer()}))
	h.Equal(Get(userGroups.List()[0], "numberOfSeasons"), 2, "season counter")
	h.Equal(Get(userGroups.List()[0], "numberOfMatches"), 0, "matches counter is per active season")

	// the closed season is read-only
	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/seasons/" + oldSeason + "/matches"), Auth: owner.Bearer(), Body: map[string]any{"teams": []any{}}}), 403, "seasonAlreadyEnded")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + oldSeason + "/rules"), Auth: owner.Bearer(), Body: []any{}}), 403, "seasonAlreadyEnded")
	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/seasons/" + oldSeason + "/rule-moves"), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 403, "seasonAlreadyEnded")
}
