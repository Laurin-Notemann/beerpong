package leaderboard

import (
	"math"
	"testing"
	"time"
)

func TestEloEvenGameOnlyTheResultMoves(t *testing.T) {
	// Equal ratings and equal points: both scored their half of the game, so
	// hitting adds nothing, and the winner gets KR × Swing × (1 − 0.5).
	blue := &Stats{Elo: 1500, PlayerID: "b"}
	red := &Stats{Elo: 1500, PlayerID: "r"}
	g := calculateElo(DefaultElo, 1, 1, [2][]*Stats{{blue}, {red}}, map[string]int64{"b": 9, "r": 9}, startingGamePoints)
	want := DefaultElo.KR * DefaultElo.Swing / 2
	if math.Abs(blue.Elo-(1500+want)) > 1e-9 || math.Abs(red.Elo-(1500-want)) > 1e-9 {
		t.Fatalf("got blue %v red %v, want ±%v", blue.Elo, red.Elo, want)
	}
	if g.hitting[0][0] != 0 || g.hitting[1][0] != 0 {
		t.Fatalf("hitting %v / %v, want 0", g.hitting[0][0], g.hitting[1][0])
	}
}

func TestEloOneOnOneCountsLikeTwoOnTwo(t *testing.T) {
	// 10:8 in a 1v1 and 5+5 against 4+4 in a 2v2 are the same performance
	// for what was possible: 1 point above 9 of a 9.5 full game, half a point
	// above 4.5 of a 4.75 one.
	p := EloParams{K: 40, Swing: 1}
	stats := func(ids ...string) []*Stats {
		var out []*Stats
		for _, id := range ids {
			out = append(out, &Stats{Elo: 1500, PlayerID: id})
		}
		return out
	}
	single := calculateElo(p, 1, 1, [2][]*Stats{stats("a"), stats("b")}, map[string]int64{"a": 10, "b": 8}, 19)
	double := calculateElo(p, 1, 1, [2][]*Stats{stats("a", "b"), stats("c", "d")}, map[string]int64{"a": 5, "b": 5, "c": 4, "d": 4}, 19)
	if math.Abs(single.hitting[0][0]-double.hitting[0][0]) > 1e-9 || math.Abs(single.hitting[0][0]-40/9.5) > 1e-9 {
		t.Fatalf("1v1 hitting %v, 2v2 hitting %v, want %v", single.hitting[0][0], double.hitting[0][0], 40/9.5)
	}
}

func TestEloSharesFollowThrowsAndRatings(t *testing.T) {
	// 3v2 with equal ratings: teams throw equally often, so each of the pair
	// throws 1.5 times as often: a quarter of the points each, a sixth each
	// for the three
	var three, two []*Stats
	own := map[string]int64{}
	for _, id := range []string{"a", "b", "c"} {
		three = append(three, &Stats{Elo: 1500, PlayerID: id})
		own[id] = 2
	}
	for _, id := range []string{"d", "e"} {
		two = append(two, &Stats{Elo: 1500, PlayerID: id})
		own[id] = 3
	}
	g := calculateElo(DefaultElo, 0.5, 1, [2][]*Stats{three, two}, own, startingGamePoints)
	if math.Abs(g.share[0][0]-1.0/6) > 1e-9 || math.Abs(g.share[1][0]-0.25) > 1e-9 {
		t.Fatalf("shares %v (three) and %v (two), want 1/6 and 1/4", g.share[0][0], g.share[1][0])
	}

	// a player 10 times as strong takes 10 of the 13 parts of a 2v2
	strong := []*Stats{{Elo: 1500 + eloDivider*DefaultElo.Swing, PlayerID: "s"}, {Elo: 1500, PlayerID: "w"}}
	others := []*Stats{{Elo: 1500, PlayerID: "x"}, {Elo: 1500, PlayerID: "y"}}
	g = calculateElo(DefaultElo, 1, 1, [2][]*Stats{strong, others}, map[string]int64{"s": 1, "w": 1, "x": 1, "y": 1}, startingGamePoints)
	if math.Abs(g.share[0][0]-10.0/13) > 1e-9 {
		t.Fatalf("strong player's share %v, want 10/13", g.share[0][0])
	}
}

func TestEloScoringMoreNeverCostsTheLeader(t *testing.T) {
	// A live 1v1, the favourite ahead: every cup they score adds rating
	last := math.Inf(-1)
	for cups := int64(1); cups <= 9; cups++ {
		fav := &Stats{Elo: 1800, PlayerID: "f"}
		dog := &Stats{Elo: 1400, PlayerID: "d"}
		calculateElo(DefaultElo, 1, 1, [2][]*Stats{{fav}, {dog}}, map[string]int64{"f": cups, "d": 1}, startingGamePoints)
		if !(fav.Elo > last) {
			t.Fatalf("%d:1 gives %v, not more than %v", cups, fav.Elo, last)
		}
		last = fav.Elo
	}
}

// twoOnTwo is one 2v2 match: A and B (A finishing with finish) beat C and D.
// A normal finish comes after 10 cups, a ring of fire after 4.
func twoOnTwo(finish string) Input {
	profile := func(s string) *string { return &s }
	cups := [4]int32{5, 5, 4, 4} // A, B, C, D
	if finish == "ring" {
		cups = [4]int32{2, 2, 2, 1}
	}
	return Input{
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
			Moves: []Move{{TeamMemberID: "ma", MoveID: "cup", Value: cups[0]}, {TeamMemberID: "mb", MoveID: "cup", Value: cups[1]},
				{TeamMemberID: "ma", MoveID: finish, Value: 1},
				{TeamMemberID: "mc", MoveID: "cup", Value: cups[2]}, {TeamMemberID: "md", MoveID: "cup", Value: cups[3]}},
		}},
		RuleMoves: map[string]RuleMove{
			"cup":    {PointsForScorer: 1, Cups: 1},
			"normal": {PointsForScorer: 1, PointsForTeam: 3, Finishing: true},
			"ring":   {PointsForScorer: 1, PointsForTeam: 10, Finishing: true, Cups: 6},
		},
		ProfileOf: map[string]string{"pa": "A", "pb": "B", "pc": "C", "pd": "D"},
	}
}

func TestEloRingWinCountsMore(t *testing.T) {
	game := func(finish string) Game {
		in := twoOnTwo(finish)
		in.Trace = true
		res, err := Compute(in)
		if err != nil {
			t.Fatal(err)
		}
		return res.Games[0]
	}
	normal, ring := game("normal"), game("ring")
	// the ring's team bonus is 10 against a normal finish's 3, at the default
	// RingWeight its square root
	want := math.Sqrt(10.0 / 3)
	if normal.Ring != 1 || math.Abs(ring.Ring-want) > 1e-9 {
		t.Fatalf("result factor: normal %v, ring %v, want 1 and %v", normal.Ring, ring.Ring, want)
	}
	if got := ring.Teams[0].Players[0].Result / normal.Teams[0].Players[0].Result; math.Abs(got-want) > 1e-9 {
		t.Fatalf("a ring win counted %v normal wins, want %v", got, want)
	}
	if ringFactor(EloParams{RingWeight: 0}, 10, 3) != 1 || ringFactor(EloParams{RingWeight: 1}, 3, 3) != 1 {
		t.Fatal("a ring weight of 0, or a ring bonus no bigger than a normal finish's, counts like a normal win")
	}
}

func TestEloScalesToTheFullGamesSoFar(t *testing.T) {
	// the first game has no full game to average; a normal finish is one (19
	// own points), a ring isn't
	full := func(first string) float64 {
		in := twoOnTwo(first)
		second := twoOnTwo("normal").Matches[0]
		second.ID, second.Date = "m2", in.Matches[0].Date.Add(time.Hour)
		in.Matches = append(in.Matches, second)
		in.Trace = true
		res, err := Compute(in)
		if err != nil {
			t.Fatal(err)
		}
		if res.Games[0].FullPoints != startingGamePoints {
			t.Fatalf("first game scaled to %v, want %v", res.Games[0].FullPoints, startingGamePoints)
		}
		return res.Games[1].FullPoints
	}
	if afterNormal, afterRing := full("normal"), full("ring"); afterNormal != 19 || afterRing != startingGamePoints {
		t.Fatalf("after a normal finish %v (want 19), after a ring %v (want %v)", afterNormal, afterRing, startingGamePoints)
	}
}

func TestTraceExplainsEveryChange(t *testing.T) {
	in := twoOnTwo("ring")
	in.Matches = append(in.Matches, in.Matches[0])
	in.Matches[1].ID, in.Matches[1].Date = "m2", in.Matches[0].Date.Add(time.Hour)
	in.Trace = true
	res, err := Compute(in)
	if err != nil {
		t.Fatal(err)
	}
	final := map[string]float64{}
	for _, e := range res.Entries {
		final[*e.Player.ProfileID] = e.Stats.Elo
	}
	last := map[string]float64{}
	for _, g := range res.Games {
		for _, team := range g.Teams {
			for _, p := range team.Players {
				if d := p.After - p.Before - p.Result - p.Hitting; math.Abs(d) > 1e-9 {
					t.Fatalf("%s in %s: result and hitting miss %v of the change", p.ProfileID, g.MatchID, d)
				}
				if d := p.Expected - p.Share*float64(g.Points); math.Abs(d) > 1e-9 {
					t.Fatalf("%s in %s: expected isn't the share of the game's points", p.ProfileID, g.MatchID)
				}
				last[p.ProfileID] = p.After
			}
		}
	}
	if len(res.Games) != 2 || len(last) != 4 {
		t.Fatalf("traced %d games and %d players, want 2 and 4", len(res.Games), len(last))
	}
	for id, elo := range last {
		if elo != final[id] {
			t.Fatalf("%s: trace ends at %v, leaderboard says %v", id, elo, final[id])
		}
	}
}

func TestProjectedLiveMatch(t *testing.T) {
	profile := func(s string) *string { return &s }
	// one finished match, then a live one in progress: blue has taken bc cups, red rc
	var live Game
	board := func(projected bool, bc, rc int32) (map[string]*Stats, error) {
		in := Input{
			Trace: true,
			Players: []Player{
				{ID: "pa", ProfileID: profile("A"), SeasonID: "s", Active: true},
				{ID: "pb", ProfileID: profile("B"), SeasonID: "s", Active: true},
			},
			Matches: []Match{
				{
					ID: "done", Date: time.Now().Add(-time.Hour), TeamIDs: []string{"t1", "t2"},
					Members: []Member{{ID: "m1", TeamID: "t1", PlayerID: "pa"}, {ID: "m2", TeamID: "t2", PlayerID: "pb"}},
					Moves: []Move{{TeamMemberID: "m1", MoveID: "cup", Value: 9}, {TeamMemberID: "m1", MoveID: "finish", Value: 1},
						{TeamMemberID: "m2", MoveID: "cup", Value: 9}},
				},
				{
					ID: "live", Date: time.Now(), TeamIDs: []string{"t3", "t4"}, Projected: projected,
					Members: []Member{{ID: "m3", TeamID: "t3", PlayerID: "pa"}, {ID: "m4", TeamID: "t4", PlayerID: "pb"}},
					Moves:   []Move{{TeamMemberID: "m3", MoveID: "cup", Value: bc}, {TeamMemberID: "m4", MoveID: "cup", Value: rc}},
				},
			},
			RuleMoves: map[string]RuleMove{
				"cup":    {PointsForScorer: 1, Cups: 1},
				"finish": {PointsForScorer: 1, PointsForTeam: 3, Finishing: true},
			},
			ProfileOf: map[string]string{"pa": "A", "pb": "B"},
		}
		res, err := Compute(in)
		out := map[string]*Stats{}
		for _, e := range res.Entries {
			out[*e.Player.ProfileID] = e.Stats
		}
		if len(res.Games) == 2 {
			live = res.Games[1]
		}
		return out, err
	}

	if _, err := board(false, 5, 3); err == nil {
		t.Fatal("a stored match without a finish still has no winner")
	}
	before, _ := board(true, 0, 0)
	atStart := live.Teams[0].Players[0].Share
	leads, err := board(true, 3, 5)
	if err != nil {
		t.Fatal(err)
	}
	// B leads the live match: counted as B's win, with the points so far
	if leads["B"].Wins != 1 || leads["B"].Matches != 2 || leads["B"].Points != 14 {
		t.Fatalf("B: got %+v", *leads["B"])
	}
	if leads["B"].Elo <= before["B"].Elo || leads["A"].Elo >= before["A"].Elo {
		t.Fatalf("the leader should gain: A %v -> %v, B %v -> %v", before["A"].Elo, leads["A"].Elo, before["B"].Elo, leads["B"].Elo)
	}
	// the share is set before the game; the expectation is that share of the
	// points scored so far
	if got := live.Teams[0].Players[0]; got.Share != atStart || math.Abs(got.Expected-got.Share*8) > 1e-9 {
		t.Fatalf("3:5 share %v (at 0:0: %v), expected %v", got.Share, atStart, got.Expected)
	}
	early, _ := board(true, 1, 0)
	if early["A"].Elo <= before["A"].Elo || early["B"].Elo >= before["B"].Elo {
		t.Fatalf("1:0 early: A %v -> %v, B %v -> %v", before["A"].Elo, early["A"].Elo, before["B"].Elo, early["B"].Elo)
	}

	// a tie is a draw: nobody wins
	tied, _ := board(true, 4, 4)
	if tied["A"].Wins != 1 || tied["B"].Wins != 0 {
		t.Fatalf("a tie adds no win: A %d, B %d", tied["A"].Wins, tied["B"].Wins)
	}
}
