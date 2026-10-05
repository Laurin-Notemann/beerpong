package leaderboard

import (
	"fmt"
	"math"
	"testing"
	"time"
)

func TestEloCloseWinCountsOnce(t *testing.T) {
	// Equal ratings, a points gap of 4 per player (a close normal win) counts
	// exactly once: 175 * (1 - 0.5) = 87.5. Both scored what a solo player is
	// expected to (9 of a team's 9), so hitting adds nothing.
	blue := &Stats{Elo: 1500, PlayerID: "b"}
	red := &Stats{Elo: 1500, PlayerID: "r"}
	calculateElo(DefaultElo, 1, []*Stats{blue}, []*Stats{red}, map[string]int64{"b": 8, "r": 4}, map[string]int64{"b": 9, "r": 9}, 9, 1)
	if blue.Elo != 1587.5 || red.Elo != 1412.5 {
		t.Fatalf("got blue %v red %v, want 1587.5 / 1412.5", blue.Elo, red.Elo)
	}
}

func TestEloCarrierPassesAWinnerWhoHitsLess(t *testing.T) {
	// S hits 6 a game but always loses with W, who hits 1, against A (5 and
	// the finish) and B (4).
	profile := func(s string) *string { return &s }
	in := Input{
		RuleMoves: map[string]RuleMove{
			"cup":    {PointsForScorer: 1, Cups: 1},
			"normal": {PointsForScorer: 1, PointsForTeam: 3, Finishing: true, Cups: 1},
		},
		ProfileOf: map[string]string{},
	}
	for _, id := range []string{"S", "W", "A", "B"} {
		in.Players = append(in.Players, Player{ID: "p" + id, ProfileID: profile(id), SeasonID: "s", Active: true})
		in.ProfileOf["p"+id] = id
	}
	start := time.Now()
	for g := range 20 {
		member := func(id string) string { return fmt.Sprintf("%d%s", g, id) }
		m := Match{ID: fmt.Sprint(g), Date: start.Add(time.Duration(g) * time.Minute), TeamIDs: []string{"t1", "t2"}}
		for _, x := range [][2]string{{"S", "t1"}, {"W", "t1"}, {"A", "t2"}, {"B", "t2"}} {
			m.Members = append(m.Members, Member{ID: member(x[0]), TeamID: x[1], PlayerID: "p" + x[0]})
		}
		m.Moves = []Move{{member("S"), "cup", 6}, {member("W"), "cup", 1}, {member("A"), "cup", 5},
			{member("A"), "normal", 1}, {member("B"), "cup", 4}}
		in.Matches = append(in.Matches, m)
	}
	res, err := Compute(in)
	if err != nil {
		t.Fatal(err)
	}
	elo := map[string]float64{}
	for _, e := range res.Entries {
		elo[*e.Player.ProfileID] = e.Stats.Elo
	}
	if !(elo["S"] > elo["B"]) {
		t.Fatalf("losing with a weak partner should not bury S below B, who hits less: S %v, B %v", elo["S"], elo["B"])
	}
	// winning still counts: A hits as much as S and wins
	if !(elo["A"] > elo["S"]) {
		t.Fatalf("A hits as much as S and wins, so should stay ahead: A %v, S %v", elo["A"], elo["S"])
	}
}

// twoOnTwo is one 2v2 match: A and B (A finishing with finish) beat C and D,
// everyone hitting at the same rate. A normal finish comes after 10 cups, a
// ring of fire after 4, so everyone hit 40% as many cups.
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

func TestEloRingFinishCountsMoreThanNormalFinish(t *testing.T) {
	game := func(finish string) (map[string]*Stats, Game) {
		in := twoOnTwo(finish)
		in.Trace = true
		res, err := Compute(in)
		if err != nil {
			t.Fatal(err)
		}
		out := map[string]*Stats{}
		for _, e := range res.Entries {
			out[*e.Player.ProfileID] = e.Stats
		}
		return out, res.Games[0]
	}
	normal, normalGame := game("normal")
	ring, ringGame := game("ring")
	// the ring ended the game after 4 cups, so only 40% of a game's points
	// were expected
	if ringGame.Share != 0.4 || normalGame.Share != 1 {
		t.Fatalf("share of a game: ring %v, normal %v", ringGame.Share, normalGame.Share)
	}
	// the bonus belongs to every teammate: both gain more than with a normal
	// finish at the same hitting rate
	for _, id := range []string{"A", "B"} {
		if !(ring[id].Elo > normal[id].Elo+20) {
			t.Fatalf("a ring should clearly lift %s: %v vs %v", id, ring[id].Elo, normal[id].Elo)
		}
	}
	if loser := ringGame.Teams[1].Players[0]; !(loser.Result < normalGame.Teams[1].Players[0].Result) {
		t.Fatalf("losing to a ring should cost more: %v", loser.Result)
	}
}

func TestEloFirstGameStartsFromAFixedExpectation(t *testing.T) {
	// the season's first game has no average yet: what it expects doesn't
	// depend on how it went
	expected := func(finish string) float64 {
		in := twoOnTwo(finish)
		in.Trace = true
		res, err := Compute(in)
		if err != nil {
			t.Fatal(err)
		}
		return res.Games[0].Teams[0].Players[0].Expected
	}
	if normal, ring := expected("normal"), expected("ring"); normal != ring || normal != startingTeamPoints/2 {
		t.Fatalf("first game expected %v (normal) and %v (ring), want %v", normal, ring, startingTeamPoints/2)
	}
}

func TestEloHittingIsWorthAFixedAmountPerPoint(t *testing.T) {
	// Equal ratings: each player is expected to score 4.5 of a team's 9.
	// Every own point above or below that is worth PerPoint, whatever the
	// teammate scored.
	game := func(mateOwn int64) (me, mate float64) {
		a := &Stats{Elo: 1500, PlayerID: "a"}
		b := &Stats{Elo: 1500, PlayerID: "b"}
		c := &Stats{Elo: 1500, PlayerID: "c"}
		d := &Stats{Elo: 1500, PlayerID: "d"}
		points := map[string]int64{"a": 8, "b": 8, "c": 2, "d": 2}
		own := map[string]int64{"a": 2, "b": mateOwn, "c": 2, "d": 2}
		calculateElo(DefaultElo, 1, []*Stats{a, b}, []*Stats{c, d}, points, own, 9, 1)
		return a.Elo, b.Elo
	}
	me, mate := game(10)
	if d := mate - me; math.Abs(d-8*DefaultElo.PerPoint) > 1e-9 {
		t.Fatalf("8 more points should be worth %v, got %v", 8*DefaultElo.PerPoint, d)
	}
	if again, _ := game(4); again != me {
		t.Fatalf("a teammate's points changed my rating: %v vs %v", again, me)
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
	atStart := live.Teams[0].Players[0].Expected
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
	// the expectation is set before the game and counts for the share played:
	// the leading team's cups out of 10
	if got := live.Teams[0].Players[0].Expected; got != atStart || live.Share != 0.5 {
		t.Fatalf("3:5 expected %v (at 0:0: %v), share %v", got, atStart, live.Share)
	}
	// early in a game the leader gains: only a tenth of a game's points is expected
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
