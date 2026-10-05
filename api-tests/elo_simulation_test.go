package apitests

import (
	"math"
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

// The Elo simulator (beerpong-var) opens a group with its invite code alone.
// Go only: recorded against Go.
func TestEloSimulation(t *testing.T) {
	h := New(t)
	owner, g := leaderboardGroup(h)

	board := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/leaderboard?scope=season&seasonId=" + g.SeasonID), Auth: owner.Bearer()}))
	boardElo := map[string]float64{}
	for _, e := range board.List("entries") {
		boardElo[Get(e, "profileId").(string)] = Get(e, "statistics", "elo").(float64)
	}

	sim := h.OK(h.Do(Req{Method: "GET", Path: "/elo-simulation?inviteCode=" + g.InviteCode}))
	h.Equal(sim.Str("seasonId"), g.SeasonID, "the running season by default")
	h.Equal(len(sim.List("games")), 2, "games")
	h.Equal(sim.Num("prediction", "params", "games"), 2, "predicted games")

	// with the default weights the simulator is the leaderboard
	standings := sim.List("standings")
	h.Equal(len(standings), 4, "standings")
	for i, s := range standings {
		id := Get(s, "profileId").(string)
		elo := Get(s, "elo").(float64)
		h.Equal(elo, boardElo[id], "elo of "+id)
		h.Equal(Get(s, "rank"), float64(i+1), "rank of "+id)
		h.Equal(Get(s, "baselineElo"), elo, "the baseline is the default weights")
		parts := Get(s, "result").(float64) + Get(s, "hitting").(float64)
		h.True(math.Abs(1500+parts-elo) < 1e-9, "result and hitting explain %s's elo: %v vs %v", id, 1500+parts, elo)
	}

	// every change of a game is its result plus hitting
	for _, game := range sim.List("games") {
		for _, team := range Get(game, "teams").([]any) {
			for _, p := range Get(team, "players").([]any) {
				change := Get(p, "after").(float64) - Get(p, "before").(float64)
				parts := Get(p, "result").(float64) + Get(p, "hitting").(float64)
				h.True(math.Abs(change-parts) < 1e-9, "change %v is result plus hitting %v", change, parts)
			}
		}
	}
	ring := sim.List("games")[1]
	h.Equal(Get(ring, "finishMove"), "Finish - Ring of fire", "finish move")
	h.Equal(Get(ring, "finisher"), "c", "finisher")

	// without weight nobody moves
	still := h.OK(h.Do(Req{Method: "GET", Path: "/elo-simulation?k=0&perPoint=0&inviteCode=" + g.InviteCode}))
	for _, s := range still.List("standings") {
		h.Equal(Get(s, "elo"), 1500.0, "elo without weight")
	}

	best := h.OK(h.Do(Req{Method: "GET", Path: "/elo-simulation/search?inviteCode=" + g.InviteCode}))
	h.True(best.Num("tried") > 1, "search tried %v settings", best.Num("tried"))

	h.Fail(h.Do(Req{Method: "GET", Path: "/elo-simulation?inviteCode=NOPE12345"}), 404, "groupInviteNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: "/elo-simulation?inviteCode="}), 400, "invalidGroupInviteCode")
	h.SpringError(h.Do(Req{Method: "GET", Path: "/elo-simulation?k=lots&inviteCode=" + g.InviteCode}), 400, "Bad Request", "/elo-simulation")
}

// Test games count where they say and are never stored.
func TestEloSimulationTestGames(t *testing.T) {
	h := New(t)
	owner, g := leaderboardGroup(h)
	// a and c played twice, b and d once
	h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + g.SeasonID), Auth: owner.Bearer(),
		Body: map[string]any{"seasonSettings": map[string]any{"minMatchesToQualify": 2}}}))

	path := "/elo-simulation?inviteCode=" + g.InviteCode
	ranks := func(res *Resp) map[string]any {
		out := map[string]any{}
		for _, s := range res.List("standings") {
			out[Get(s, "profileId").(string)] = Get(s, "rank")
		}
		return out
	}
	stored := h.OK(h.Do(Req{Method: "GET", Path: path}))
	h.Equal(stored.Num("seasons", "0", "minMatchesToQualify"), 2, "the season's minimum")
	r := ranks(stored)
	h.True(r[g.Profiles["a"]] != nil && r[g.Profiles["c"]] != nil, "a and c are ranked: %v", r)
	h.Equal(r[g.Profiles["b"]], nil, "b is unranked")
	h.Equal(r[g.Profiles["d"]], nil, "d is unranked")

	test := func(after string, finishers ...string) map[string]any {
		team := func(name string) []any {
			moves := []any{map[string]any{"moveId": g.Moves["Normal"], "count": 3}}
			for _, f := range finishers {
				if f == name {
					moves = append(moves, map[string]any{"moveId": g.Moves["Finish - Normal"], "count": 1})
				}
			}
			return []any{map[string]any{"profileId": g.Profiles[name], "moves": moves}}
		}
		return map[string]any{"after": after, "teams": []any{team("d"), team("b")}}
	}
	post := func(games ...any) *Resp {
		return h.Do(Req{Method: "POST", Path: path, Body: map[string]any{"testGames": games}})
	}

	atEnd := h.OK(post(test("end", "d")))
	h.Equal(atEnd.Str("baseline"), "storedGames", "baseline")
	games := atEnd.List("games")
	h.Equal(len(games), 3, "the test game counts")
	h.Equal(Get(games[2], "testIndex"), 0.0, "and comes last")
	h.Equal(Get(games[0], "testIndex"), nil, "real games aren't tests")
	h.True(ranks(atEnd)[g.Profiles["d"]] != nil, "d's second game ranks them")
	for _, s := range atEnd.List("standings") {
		played := Get(s, "profileId") == g.Profiles["b"] || Get(s, "profileId") == g.Profiles["d"]
		if !played {
			h.Equal(Get(s, "elo"), Get(s, "baselineElo"), "a game at the end moves only its players")
		}
	}

	// at the start it changes the ratings every later game starts from
	atStart := h.OK(post(test("start", "d")))
	h.Equal(Get(atStart.List("games")[0], "testIndex"), 0.0, "the test game comes first")
	for _, s := range atStart.List("standings") {
		if Get(s, "profileId") == g.Profiles["c"] {
			h.True(Get(s, "elo") != Get(s, "baselineElo"), "c's later games change")
		}
	}

	// nothing was stored
	again := h.OK(h.Do(Req{Method: "GET", Path: path}))
	h.Equal(len(again.List("games")), 2, "real games after the tests")

	h.Fail(post(test("end", "d", "b")), 400, "eloInvalidTestGame")
	h.Fail(post(test("end")), 400, "eloInvalidTestGame")
	h.Fail(post(test("not-a-game", "d")), 400, "eloInvalidTestGame")
}

// Running live matches count as if they ended now, like on the TV.
func TestEloSimulationLiveMatches(t *testing.T) {
	h := New(t)
	owner, g := leaderboardGroup(h)
	id := newLiveMatchID()
	h.OK(putLiveMatch(h, owner, g, id, setTeams(g, "a", "b"), adjustMove(g, "a", 3)))

	path := "/elo-simulation?inviteCode=" + g.InviteCode
	running := h.OK(h.Do(Req{Method: "GET", Path: "/elo-simulation/live-matches?inviteCode=" + g.InviteCode, Ordered: true}))
	h.Equal(len(running.List()), 1, "running live matches")
	h.Equal(running.Str("0", "id"), id, "the live match")

	// the teams as the app reduces the ops: blue b, red a with three Normals
	teams := []any{
		map[string]any{"teamMembers": []any{map[string]any{"playerId": g.Players["b"], "moves": []any{}}}},
		map[string]any{"teamMembers": []any{map[string]any{"playerId": g.Players["a"], "moves": []any{
			map[string]any{"moveId": g.Moves["Normal"], "count": 3}}}}},
	}
	post := func(liveID string) *Resp {
		return h.Do(Req{Method: "POST", Path: path, Body: map[string]any{
			"liveMatches": []any{map[string]any{"liveMatchId": liveID, "teams": teams}}}})
	}
	sim := h.OK(post(id))
	h.Equal(sim.Str("baseline"), "storedGames", "baseline")
	games := sim.List("games")
	h.Equal(len(games), 3, "the live match counts")
	h.Equal(Get(games[2], "liveMatchId"), id, "as the last game")
	h.Equal(Get(games[2], "teams", "1", "won"), true, "the team with more cups leads")
	for _, s := range sim.List("standings") {
		if Get(s, "profileId") == g.Profiles["a"] {
			h.True(Get(s, "elo").(float64) > Get(s, "baselineElo").(float64), "a gains from leading")
		}
	}

	h.Equal(len(h.OK(post(newLiveMatchID())).List("games")), 2, "a live match that isn't running doesn't count")
	h.Fail(h.Do(Req{Method: "POST", Path: path, Body: map[string]any{
		"liveMatches": []any{map[string]any{"liveMatchId": id}}}}), 400, "eloInvalidLiveMatch")
}
