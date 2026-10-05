package apitests

import (
	"testing"
	"time"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

// leaderboardGroup plays two matches with hand-computed results:
//
//	match 1: blue a (Normal x2, Finish - Normal), b (Bomb) vs red c (Normal x3), d (Normal)
//	match 2: blue c (Finish - Ring of fire) vs red a (Normal)
//
// Team points of a finishing move go to every member of the scoring team.
// "moves" counts cups: Bomb 1, Finish - Normal 0, Ring of fire 6.
func leaderboardGroup(h *H) (*User, *Group) {
	owner := h.NewUser()
	g := h.NewGroup(owner, "Leaderboard", "a", "b", "c", "d")
	h.OK(h.CreateMatch(owner, g,
		[]Member{{"a", map[string]int{"Normal": 2, "Finish - Normal": 1}}, {"b", map[string]int{"Bomb": 1}}},
		[]Member{{"c", map[string]int{"Normal": 3}}, {"d", map[string]int{"Normal": 1}}},
	))
	h.OK(h.CreateMatch(owner, g,
		[]Member{{"c", map[string]int{"Finish - Ring of fire": 1}}},
		[]Member{{"a", map[string]int{"Normal": 1}}},
	))
	return owner, g
}

type wantStats struct {
	points, matches, wins, moves, teamSize float64
	avgPoints, avgTeamSize                 float64
}

var seasonStats = map[string]wantStats{
	"a": {points: 7, matches: 2, wins: 1, moves: 3, teamSize: 3, avgPoints: 3.5, avgTeamSize: 1.5},
	"b": {points: 5, matches: 1, wins: 1, moves: 1, teamSize: 2, avgPoints: 5, avgTeamSize: 2},
	"c": {points: 14, matches: 2, wins: 1, moves: 9, teamSize: 3, avgPoints: 7, avgTeamSize: 1.5},
	"d": {points: 1, matches: 1, wins: 0, moves: 1, teamSize: 2, avgPoints: 1, avgTeamSize: 2},
}

func checkStats(h *H, g *Group, entries []any, want map[string]wantStats) {
	h.Helper()
	byProfile := map[string]any{}
	for _, e := range entries {
		byProfile[Get(e, "profileId").(string)] = Get(e, "statistics")
	}
	h.Equal(len(entries), len(want), "leaderboard entries")
	for name, w := range want {
		s := byProfile[g.Profiles[name]]
		h.True(s != nil, "no entry for %s", name)
		h.Equal(Get(s, "points"), w.points, name+" points")
		h.Equal(Get(s, "matches"), w.matches, name+" matches")
		h.Equal(Get(s, "wins"), w.wins, name+" wins")
		h.Equal(Get(s, "moves"), w.moves, name+" moves")
		h.Equal(Get(s, "totalTeamSize"), w.teamSize, name+" totalTeamSize")
		h.Equal(Get(s, "avgPointsPerMatch"), w.avgPoints, name+" avgPointsPerMatch")
		h.Equal(Get(s, "avgTeamSize"), w.avgTeamSize, name+" avgTeamSize")
		h.Equal(Get(s, "id"), nil, name+" statistics id is hidden")
	}
}

func TestLeaderboardSeason(t *testing.T) {
	h := New(t)
	owner, g := leaderboardGroup(h)

	res := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}))
	h.Equal(res.Num("numMatches"), 2, "numMatches")
	h.Equal(res.Num("numPlayers"), 4, "numPlayers")
	checkStats(h, g, res.List("entries"), seasonStats)

	elo := map[string]float64{}
	for _, e := range res.List("entries") {
		elo[Get(e, "profileId").(string)] = Get(e, "statistics", "elo").(float64)
	}
	h.True(elo[g.Profiles["c"]] > 1500, "c won a match and gained elo: %v", elo[g.Profiles["c"]])
	h.True(elo[g.Profiles["d"]] < 1500, "d lost and scored little: %v", elo[g.Profiles["d"]])

	extended := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players/extended"), Auth: owner.Bearer()}))
	checkStats(h, g, extended.List(), seasonStats)

	today := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=today"), Auth: owner.Bearer()}))
	checkStats(h, g, today.List("entries"), seasonStats)
	h.Equal(today.Num("numMatches"), 2, "today numMatches")

	// deleted players drop out of the season and daily boards
	h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + g.Players["d"]), Auth: owner.Bearer()}))
	withoutD := map[string]wantStats{"a": seasonStats["a"], "b": seasonStats["b"], "c": seasonStats["c"]}
	res = h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}))
	checkStats(h, g, res.List("entries"), withoutD)
	h.Equal(res.Num("numPlayers"), 3, "numPlayers without inactive")
	h.Equal(res.Num("numMatches"), 2, "numMatches still counts their matches")
	today = h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=today"), Auth: owner.Bearer()}))
	checkStats(h, g, today.List("entries"), withoutD)

	allTime := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=all-time"), Auth: owner.Bearer()}))
	checkStats(h, g, allTime.List("entries"), seasonStats)
	h.Equal(allTime.Num("numPlayers"), 4, "all-time includes inactive players")
}

func TestLeaderboardDailyModes(t *testing.T) {
	h := New(t)
	owner, g := leaderboardGroup(h)
	for _, mode := range []string{"RESET_AT_MIDNIGHT", "LAST_24_HOURS", "WAKE_TIME"} {
		h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + g.SeasonID), Auth: owner.Bearer(), Body: map[string]any{"seasonSettings": map[string]any{"dailyLeaderboard": mode}}}))
		today := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=today"), Auth: owner.Bearer()}))
		h.Equal(today.Num("numMatches"), 2, mode+" numMatches")
		checkStats(h, g, today.List("entries"), seasonStats)
	}
	// a wake time later today means the day started at yesterday's wake time
	later := time.Now().UTC().Add(2 * time.Minute)
	if later.Day() == time.Now().UTC().Day() {
		// not recorded: the wake time depends on the clock
		h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + g.SeasonID), Auth: owner.Bearer(), Skip: true, Body: map[string]any{"seasonSettings": map[string]any{"dailyLeaderboard": "WAKE_TIME", "wakeTime": later.Format("15:04")}}}))
		today := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=today"), Auth: owner.Bearer(), Skip: true}))
		h.Equal(today.Num("numMatches"), 2, "wake time later today")
	}
}

func TestLeaderboardDailyExcludesOlderMatches(t *testing.T) {
	h := New(t)
	db := h.DB()
	owner, g := leaderboardGroup(h)
	matches := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/overview"), Auth: owner.Bearer()}))
	var second string
	for _, m := range matches.List() {
		if Get(m, "blueTeam", "points") == float64(11) {
			second = Get(m, "id").(string)
		}
	}
	h.True(second != "", "found the second match")
	h.Exec(db, "UPDATE matches SET date = now() - interval '30 hours' WHERE id = $1", second)

	for _, mode := range []string{"RESET_AT_MIDNIGHT", "LAST_24_HOURS", "WAKE_TIME"} {
		h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + g.SeasonID), Auth: owner.Bearer(), Body: map[string]any{"seasonSettings": map[string]any{"dailyLeaderboard": mode}}}))
		today := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=today"), Auth: owner.Bearer()}))
		h.Equal(today.Num("numMatches"), 1, mode+" only counts recent matches")
		checkStats(h, g, today.List("entries"), map[string]wantStats{
			"a": {points: 6, matches: 1, wins: 1, moves: 2, teamSize: 2, avgPoints: 6, avgTeamSize: 2},
			"b": {points: 5, matches: 1, wins: 1, moves: 1, teamSize: 2, avgPoints: 5, avgTeamSize: 2},
			"c": {points: 3, matches: 1, wins: 0, moves: 3, teamSize: 2, avgPoints: 3, avgTeamSize: 2},
			"d": {points: 1, matches: 1, wins: 0, moves: 1, teamSize: 2, avgPoints: 1, avgTeamSize: 2},
		})
	}
	// matches are processed in date order, so Elo depends on the order of play
	h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}))
}

func TestLeaderboardAcrossSeasons(t *testing.T) {
	h := New(t)
	owner, g := leaderboardGroup(h)
	h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + g.Players["d"]), Auth: owner.Bearer()}))
	group := h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: owner.Bearer()}))
	firstSeason := g.SeasonID

	h.StartSeason(g, "First")
	h.OK(h.CreateMatch(owner, g, []Member{{"b", map[string]int{"Finish - Normal": 1}}}, []Member{{"a", map[string]int{"Normal": 4}}}))

	season := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}))
	h.Equal(season.Num("numMatches"), 1, "matches in the new season")
	byProfile := map[string]any{}
	for _, e := range season.List("entries") {
		byProfile[Get(e, "profileId").(string)] = Get(e, "statistics")
	}
	h.Equal(Get(byProfile[g.Profiles["b"]], "points"), 4, "season board starts from zero")
	h.Equal(Get(byProfile[g.Profiles["c"]], "matches"), 0, "c did not play this season")

	allTime := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=all-time"), Auth: owner.Bearer()}))
	h.Equal(allTime.Num("numMatches"), 3, "all-time matches include past seasons")
	h.Equal(allTime.Data("startedAt"), group.Data("createdAt"), "all-time starts with the group")
	byProfile = map[string]any{}
	for _, e := range allTime.List("entries") {
		byProfile[Get(e, "profileId").(string)] = Get(e, "statistics")
	}
	h.Equal(Get(byProfile[g.Profiles["a"]], "points"), 7+4, "a all-time points")
	h.Equal(Get(byProfile[g.Profiles["b"]], "points"), 5+4, "b all-time points")
	h.Equal(Get(byProfile[g.Profiles["b"]], "wins"), 2, "b all-time wins")
	h.Equal(Get(byProfile[g.Profiles["c"]], "points"), 14, "c all-time points")
	h.Equal(len(allTime.List("entries")), 4, "all-time keeps players that were not carried over")

	old := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + firstSeason), Auth: owner.Bearer()}))
	h.Equal(old.Num("numMatches"), 2, "closed season board")
	h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + firstSeason + "/players/extended"), Auth: owner.Bearer()}))

	// a third season carries the cumulative stats again
	h.StartSeason(g, "Second")
	allTime = h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=all-time"), Auth: owner.Bearer()}))
	h.Equal(allTime.Num("numMatches"), 3, "all-time matches after another season")
}

func TestLeaderboardValidation(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "LB validation", "a")
	other := h.NewGroup(owner, "Other", "z")

	h.SpringError(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard"), Auth: owner.Bearer()}), 400, "Bad Request", g.Path("/leaderboard"))
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=weekly"), Auth: owner.Bearer()}), 404, "leaderboardScopeNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season"), Auth: owner.Bearer()}), 404, "leaderboardScopeNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=nope"), Auth: owner.Bearer()}), 404, "seasonNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + other.SeasonID), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")

	empty := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}))
	h.Equal(empty.Num("numMatches"), 0, "no matches")
	h.Equal(empty.Num("numPlayers"), 1, "one player")
	h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=today&seasonId=ignored"), Auth: owner.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=all-time"), Auth: owner.Bearer()}))
}

func TestLeaderboardWithoutFinishingMove(t *testing.T) {
	h := New(t)
	owner, g := leaderboardGroup(h)
	// turning the finishing move into a normal one leaves matches without a winner
	h.OK(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/rule-moves/" + g.Moves["Finish - Normal"]), Auth: owner.Bearer(), Body: map[string]any{"name": "Finish - Normal", "pointsForScorer": 1, "pointsForTeam": 3, "finishingMove": false}}))
	h.SpringError(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}), 500, "Internal Server Error", g.Path("/leaderboard"))
	h.SpringError(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players/extended"), Auth: owner.Bearer()}), 500, "Internal Server Error", g.SeasonPath("/players/extended"))
	// match overviews don't need a winner
	h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/overview"), Auth: owner.Bearer()}))
}

// A projection counts live matches as if they ended now, without storing them.
func TestLeaderboardProjection(t *testing.T) {
	h := New(t)
	owner, g := leaderboardGroup(h)
	path := g.Path("/leaderboard/projection?scope=season&seasonId=" + g.SeasonID)
	project := func(matches ...map[string]any) *Resp {
		return h.Do(Req{Method: "POST", Path: path, Auth: owner.Bearer(), Body: map[string]any{"matches": matches}})
	}

	// b leads d 3 cups to 1: counted as b's win, with the points so far
	leading := g.MatchBody([]Member{{"b", map[string]int{"Normal": 3}}}, []Member{{"d", map[string]int{"Normal": 1}}})
	res := h.OK(project(leading))
	h.Equal(res.Num("numMatches"), 3, "numMatches with the live match")
	want := map[string]wantStats{
		"a": seasonStats["a"],
		"b": {points: 8, matches: 2, wins: 2, moves: 4, teamSize: 3, avgPoints: 4, avgTeamSize: 1.5},
		"c": seasonStats["c"],
		"d": {points: 2, matches: 2, wins: 0, moves: 2, teamSize: 3, avgPoints: 1, avgTeamSize: 1.5},
	}
	checkStats(h, g, res.List("entries"), want)

	// a tie is a draw: nobody wins
	tied := g.MatchBody([]Member{{"b", map[string]int{"Normal": 2}}}, []Member{{"d", map[string]int{"Normal": 2}}})
	res = h.OK(project(tied))
	wins := map[string]float64{}
	for _, e := range res.List("entries") {
		wins[Get(e, "profileId").(string)] = Get(e, "statistics", "wins").(float64)
	}
	h.Equal(wins[g.Profiles["b"]], 1.0, "b wins nothing more on a tie")
	h.Equal(wins[g.Profiles["d"]], 0.0, "d wins nothing on a tie")

	// a recorded finish decides, whoever took more cups
	finished := g.MatchBody([]Member{{"b", map[string]int{"Normal": 1, "Finish - Normal": 1}}}, []Member{{"d", map[string]int{"Normal": 3}}})
	res = h.OK(project(finished))
	for _, e := range res.List("entries") {
		if Get(e, "profileId") == g.Profiles["b"] {
			h.Equal(Get(e, "statistics", "wins"), 2.0, "the finish wins")
		}
	}

	// nothing was stored
	stored := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}))
	checkStats(h, g, stored.List("entries"), seasonStats)

	h.Fail(h.Do(Req{Method: "POST", Path: path, Auth: owner.Bearer(), Body: map[string]any{}}), 400, "leaderboardInvalidProjection")
	oneTeam := map[string]any{"teams": []any{leading["teams"].([]any)[0]}}
	h.Fail(project(oneTeam), 400, "leaderboardInvalidProjection")
}
