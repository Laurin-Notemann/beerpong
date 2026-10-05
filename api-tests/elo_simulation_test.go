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
		h.Equal(Get(s, "defaultRank"), float64(i+1), "default rank of "+id)
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
