package leaderboard

import (
	"math"
	"testing"
	"time"
)

func TestEloCloseWinCountsOnce(t *testing.T) {
	// Equal ratings, a points gap of 4 per player (a close normal win) counts
	// exactly once: 350 * (1 - 0.5) = 175. Both scored what a solo player is
	// expected to (9 of a team's 9), so hitting adds nothing.
	blue := &Stats{Elo: 1500, PlayerID: "b"}
	red := &Stats{Elo: 1500, PlayerID: "r"}
	calculateElo(true, []*Stats{blue}, []*Stats{red}, map[string]int64{"b": 8, "r": 4}, map[string]int64{"b": 9, "r": 9}, 9)
	if blue.Elo != 1675 || red.Elo != 1325 {
		t.Fatalf("got blue %v red %v, want 1675 / 1325", blue.Elo, red.Elo)
	}
}

func TestEloRingFinishCountsMoreThanNormalFinish(t *testing.T) {
	profile := func(s string) *string { return &s }
	game := func(finish string) map[string]*Stats {
		in := Input{
			Players: []Player{
				{ID: "pa", ProfileID: profile("A"), SeasonID: "s", Active: true},
				{ID: "pb", ProfileID: profile("B"), SeasonID: "s", Active: true},
				{ID: "pc", ProfileID: profile("C"), SeasonID: "s", Active: true},
				{ID: "pd", ProfileID: profile("D"), SeasonID: "s", Active: true},
			},
			Matches: []Match{{
				ID: "m", Date: time.Now(), TeamIDs: []string{"t1", "t2"},
				Members: []Member{{ID: "ma", TeamID: "t1", PlayerID: "pa"}, {ID: "mb", TeamID: "t1", PlayerID: "pb"},
					{ID: "mc", TeamID: "t2", PlayerID: "pc"}, {ID: "md", TeamID: "t2", PlayerID: "pd"}},
				Moves: []Move{{TeamMemberID: "ma", MoveID: "cup", Value: 4}, {TeamMemberID: "mb", MoveID: "cup", Value: 3},
					{TeamMemberID: "ma", MoveID: finish, Value: 1},
					{TeamMemberID: "mc", MoveID: "cup", Value: 5}, {TeamMemberID: "md", MoveID: "cup", Value: 3}},
			}},
			RuleMoves: map[string]RuleMove{
				"cup":    {PointsForScorer: 1, Cups: 1},
				"normal": {PointsForScorer: 1, PointsForTeam: 3, Finishing: true},
				"ring":   {PointsForScorer: 1, PointsForTeam: 10, Finishing: true, Cups: 6},
			},
			ProfileOf: map[string]string{"pa": "A", "pb": "B", "pc": "C", "pd": "D"},
		}
		res, err := Compute(in)
		if err != nil {
			t.Fatal(err)
		}
		out := map[string]*Stats{}
		for _, e := range res.Entries {
			out[*e.Player.ProfileID] = e.Stats
		}
		return out
	}
	normal, ring := game("normal"), game("ring")
	if gain := ring["A"].Elo + ring["B"].Elo - normal["A"].Elo - normal["B"].Elo; gain < 50 {
		t.Fatalf("a ring should clearly lift the team, got %v more than a normal finish", gain)
	}
	// the bonus belongs to every teammate: both get the same share of a
	// bigger team result
	if !(ring["B"].Elo > normal["B"].Elo) {
		t.Fatalf("a ring should lift the teammate too: %v vs %v", ring["B"].Elo, normal["B"].Elo)
	}
	if !(ring["C"].Elo < normal["C"].Elo) {
		t.Fatalf("losing to a ring should cost more: %v vs %v", ring["C"].Elo, normal["C"].Elo)
	}
}

func TestEloHittingIsWorthAFixedAmountPerPoint(t *testing.T) {
	// Equal ratings: each player is expected to score 4.5 of a team's 9.
	// Every own point above or below that is worth eloPerPoint, whatever the
	// teammate scored.
	game := func(mateOwn int64) (me, mate float64) {
		a := &Stats{Elo: 1500, PlayerID: "a"}
		b := &Stats{Elo: 1500, PlayerID: "b"}
		c := &Stats{Elo: 1500, PlayerID: "c"}
		d := &Stats{Elo: 1500, PlayerID: "d"}
		points := map[string]int64{"a": 8, "b": 8, "c": 2, "d": 2}
		own := map[string]int64{"a": 2, "b": mateOwn, "c": 2, "d": 2}
		calculateElo(true, []*Stats{a, b}, []*Stats{c, d}, points, own, 9)
		return a.Elo, b.Elo
	}
	me, mate := game(10)
	if d := mate - me; math.Abs(d-8*eloPerPoint) > 1e-9 {
		t.Fatalf("8 more points should be worth %v, got %v", 8*eloPerPoint, d)
	}
	if again, _ := game(4); again != me {
		t.Fatalf("a teammate's points changed my rating: %v vs %v", again, me)
	}
}
