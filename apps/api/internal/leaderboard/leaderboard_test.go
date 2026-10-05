package leaderboard

import (
	"errors"
	"math"
	"testing"
	"time"
)

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
		RuleMoves: map[string]RuleMove{"cup": {PointsForScorer: 1, Cups: 1}, "finish": {PointsForScorer: 1, PointsForTeam: 3, Finishing: true}},
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
	// Moves counts cups: two hits, and the finish on top of the last one takes none.
	if a := stats["A"]; a.Points != 6 || a.Wins != 1 || a.Moves != 2 || a.Matches != 1 || a.AvgPointsPerMatch != 6 {
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

func TestComputeIgnoresFinishWithValueZero(t *testing.T) {
	// Old matches stored every move with value 0, finishes included; the
	// second team's 0 finish must not make it the winner.
	profile := func(s string) *string { return &s }
	in := Input{
		Players: []Player{
			{ID: "pa", ProfileID: profile("A"), SeasonID: "s", Active: true},
			{ID: "pb", ProfileID: profile("B"), SeasonID: "s", Active: true},
		},
		Matches: []Match{{
			ID: "m", Date: time.Now(), TeamIDs: []string{"t1", "t2"},
			Members: []Member{{ID: "ma", TeamID: "t1", PlayerID: "pa"}, {ID: "mb", TeamID: "t2", PlayerID: "pb"}},
			Moves: []Move{{TeamMemberID: "ma", MoveID: "cup", Value: 1}, {TeamMemberID: "ma", MoveID: "finish", Value: 1},
				{TeamMemberID: "mb", MoveID: "cup", Value: 0}, {TeamMemberID: "mb", MoveID: "finish", Value: 0}},
		}},
		RuleMoves: map[string]RuleMove{"cup": {PointsForScorer: 1, Cups: 1}, "finish": {PointsForScorer: 1, PointsForTeam: 3, Finishing: true}},
		ProfileOf: map[string]string{"pa": "A", "pb": "B"},
	}
	res, err := Compute(in)
	if err != nil {
		t.Fatal(err)
	}
	wins := map[string]int64{}
	for _, e := range res.Entries {
		wins[*e.Player.ProfileID] = e.Stats.Wins
	}
	if wins["A"] != 1 || wins["B"] != 0 {
		t.Fatalf("A finished and won: got wins %v", wins)
	}
}
