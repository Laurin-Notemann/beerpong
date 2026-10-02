package leaderboard

import (
	"errors"
	"math"
	"testing"
	"time"
)

func TestEloEvenOneOnOne(t *testing.T) {
	// Equal ratings, blue wins 3:2. Each player scored all of their team's
	// points, so only the result moves the rating: 25 * (1 - 0.5) = 12.5.
	blue := &Stats{Elo: 1500, PlayerID: "b"}
	red := &Stats{Elo: 1500, PlayerID: "r"}
	calculateElo("blue", "blue", 3, 2, []*Stats{blue}, []*Stats{red}, map[string]int64{"b": 3, "r": 2})
	if blue.Elo != 1512.5 || red.Elo != 1487.5 {
		t.Fatalf("got blue %v red %v, want 1512.5 / 1487.5", blue.Elo, red.Elo)
	}
}

func TestEloRewardsShareOfTeamPoints(t *testing.T) {
	// Same team, same result: the player who scored more gains more.
	a := &Stats{Elo: 1500, PlayerID: "a"}
	b := &Stats{Elo: 1500, PlayerID: "b"}
	opp := &Stats{Elo: 1500, PlayerID: "o"}
	calculateElo("blue", "blue", 6, 2, []*Stats{a, b}, []*Stats{opp}, map[string]int64{"a": 5, "b": 1, "o": 2})
	if !(a.Elo > b.Elo && b.Elo > 1500) {
		t.Fatalf("a %v should beat b %v and both should gain", a.Elo, b.Elo)
	}
}

func TestEloChangeIsCapped(t *testing.T) {
	// An underdog who scores everything in an upset win would gain ~44.
	star := &Stats{Elo: 800, PlayerID: "s"}
	mate := &Stats{Elo: 800, PlayerID: "m"}
	favorite := &Stats{Elo: 2400, PlayerID: "f"}
	calculateElo("blue", "blue", 100, 0, []*Stats{star, mate}, []*Stats{favorite}, map[string]int64{"s": 100})
	if star.Elo != 840 {
		t.Fatalf("got %v, want the gain capped at +40", star.Elo)
	}
}

func TestComputeAggregatesStats(t *testing.T) {
	profile := func(s string) *string { return &s }
	in := Input{
		Players: []Player{
			{ID: "pa", ProfileID: profile("A"), SeasonID: "s", Active: true, Stored: FreshStats()},
			{ID: "pb", ProfileID: profile("B"), SeasonID: "s", Active: true, Stored: FreshStats()},
		},
		Matches: []Match{{
			ID: "m", Date: time.Now(), TeamIDs: []string{"t1", "t2"},
			Members: []Member{{ID: "ma", TeamID: "t1", PlayerID: "pa"}, {ID: "mb", TeamID: "t2", PlayerID: "pb"}},
			Moves:   []Move{{TeamMemberID: "ma", MoveID: "cup", Value: 2}, {TeamMemberID: "ma", MoveID: "finish", Value: 1}, {TeamMemberID: "mb", MoveID: "cup", Value: 1}},
		}},
		RuleMoves: map[string]RuleMove{"cup": {PointsForScorer: 1}, "finish": {PointsForScorer: 1, PointsForTeam: 3, Finishing: true}},
		ProfileOf: map[string]string{"pa": "A", "pb": "B"},
	}
	res, err := Compute(in)
	if err != nil {
		t.Fatal(err)
	}
	stats := map[string]*Stats{}
	for _, e := range res.Entries {
		stats[*e.Player.ProfileID] = e.Stats
	}
	if a := stats["A"]; a.Points != 6 || a.Wins != 1 || a.Moves != 3 || a.Matches != 1 || a.AvgPointsPerMatch != 6 {
		t.Fatalf("A: %+v", *a)
	}
	if b := stats["B"]; b.Points != 1 || b.Wins != 0 || b.Elo >= StartingElo {
		t.Fatalf("B: %+v", *b)
	}
	if res.NumMatches != 1 {
		t.Fatalf("NumMatches %d", res.NumMatches)
	}

	// A match without a finishing move has no winner; Java failed the request.
	in.RuleMoves["finish"] = RuleMove{PointsForScorer: 1, PointsForTeam: 3}
	if _, err := Compute(in); !errors.Is(err, ErrNoWinner) {
		t.Fatalf("want ErrNoWinner, got %v", err)
	}
}

func TestJavaHashMapOrder(t *testing.T) {
	if h := javaStringHash("hello"); h != 99162322 {
		t.Fatalf("String.hashCode(\"hello\") = %d, want 99162322", h)
	}
	if h := javaStringHash("polygenelubricants"); h != math.MinInt32 {
		t.Fatalf("hash overflow: got %d", h)
	}
	// "b" (98) lands in bucket 2, "a" (97) in bucket 1, "q" (113) in bucket 1 after "a".
	got := javaHashMapOrder([]string{"b", "q", "a"})
	want := []string{"q", "a", "b"}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
}
