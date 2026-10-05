//go:build !(js && wasm)

package main

// go run . <games.csv> <data.json>: turns the export into the page's data and
// checks that the replay gives exactly what leaderboard.Compute gives, season
// by season.

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"sort"
	"time"
)

// cups only for display; mirrors the defaults in api-go/internal/api/cups.go
var defaultCups = map[string]int64{"Normal": 1, "Bomb": 1, "Bouncer": 2, "Trickshot": 1, "Save": 0,
	"Finish - Normal": 0, "Finish - Ring of fire": 6, "Finish - Ring of water": 4}

type pageMove struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
}
type pagePlayer struct {
	Name  string     `json:"name"`
	Own   int64      `json:"own"`
	Bonus int64      `json:"bonus"`
	Moves []pageMove `json:"moves"`
}
type pageTeam struct {
	Players []*pagePlayer `json:"players"`
	Won     bool          `json:"won"`
	Cups    int64         `json:"cups"`
}
type pageGame struct {
	Date       string      `json:"date"`
	Finisher   string      `json:"finisher"`
	FinishMove string      `json:"finishMove"`
	Teams      []*pageTeam `json:"teams"`
}
type pageSeason struct {
	Name  string      `json:"name"`
	Games []*pageGame `json:"games"`
	input Input
}

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: go run . <games.csv> <data.json>")
		os.Exit(2)
	}
	f, err := os.Open(os.Args[1])
	if err != nil {
		panic(err)
	}
	rows, err := csv.NewReader(f).ReadAll()
	if err != nil {
		panic(err)
	}
	var seasons []*pageSeason
	byID := map[string]*pageSeason{}
	games := map[string]*pageGame{}
	teams := map[string]*pageTeam{}
	members := map[string]*pagePlayer{}
	matchIdx := map[string]int{}
	seenTeam := map[string]bool{}
	for _, r := range rows[1:] {
		sID, sName, mID, date, teamID, tmID, name, move, val, pfs, pft, fin, cupsCol := r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12]
		s, ok := byID[sID]
		if !ok {
			s = &pageSeason{Name: sName, input: Input{RuleMoves: map[string]RuleMove{}, ProfileOf: map[string]string{}}}
			byID[sID] = s
			seasons = append(seasons, s)
		}
		g, ok := games[mID]
		if !ok {
			g = &pageGame{Date: date[:16]}
			games[mID] = g
			s.Games = append(s.Games, g)
			d, err := time.Parse("2006-01-02 15:04:05.999999-07", date)
			if err != nil {
				panic(err)
			}
			s.input.Matches = append(s.input.Matches, Match{ID: mID, Date: d})
			matchIdx[mID] = len(s.input.Matches) - 1
		}
		m := &s.input.Matches[matchIdx[mID]]
		t, ok := teams[teamID]
		if !ok {
			t = &pageTeam{}
			teams[teamID] = t
			g.Teams = append(g.Teams, t)
		}
		if !seenTeam[teamID] {
			seenTeam[teamID] = true
			m.TeamIDs = append(m.TeamIDs, teamID)
		}
		p, ok := members[tmID]
		if !ok {
			p = &pagePlayer{Name: name}
			members[tmID] = p
			t.Players = append(t.Players, p)
			pid := sID + "/" + name
			m.Members = append(m.Members, Member{ID: tmID, TeamID: teamID, PlayerID: pid})
			if _, ok := s.input.ProfileOf[pid]; !ok {
				s.input.ProfileOf[pid] = name
				n := name
				s.input.Players = append(s.input.Players, Player{ID: pid, ProfileID: &n, SeasonID: sID, Active: true})
			}
		}
		if move == "" {
			continue
		}
		var v, sc, b, c int64
		fmt.Sscan(val, &v)
		fmt.Sscan(pfs, &sc)
		fmt.Sscan(pft, &b)
		fmt.Sscan(cupsCol, &c)
		s.input.RuleMoves[move] = RuleMove{PointsForScorer: int32(sc), PointsForTeam: int32(b), Finishing: fin == "t"}
		m.Moves = append(m.Moves, Move{TeamMemberID: tmID, MoveID: move, Value: int32(v)})
		// old matches stored every move, at count 0 when it wasn't made
		if v == 0 {
			continue
		}
		if c < 0 {
			c = defaultCups[move]
		}
		p.Own += sc * v
		p.Bonus += b * v
		t.Cups += c * v
		p.Moves = append(p.Moves, pageMove{move, v})
		if fin == "t" {
			t.Won = true
			g.Finisher, g.FinishMove = name, move
		}
	}

	var all [][]Game
	for _, s := range seasons {
		sort.SliceStable(s.Games, func(i, j int) bool { return s.Games[i].Date < s.Games[j].Date })
		var gs []Game
		for _, g := range s.Games {
			var ng Game
			for _, t := range g.Teams {
				nt := GameTeam{Won: t.Won}
				for _, p := range t.Players {
					nt.Players = append(nt.Players, GamePlayer{p.Name, p.Own, p.Bonus})
				}
				ng.Teams = append(ng.Teams, nt)
			}
			gs = append(gs, ng)
		}
		all = append(all, gs)

		res, _, _ := replay(gs, true)
		rep := map[string]Standing{}
		for _, st := range res.Standings {
			rep[st.Name] = st
		}
		cmp, err := Compute(s.input)
		if err != nil {
			panic(err)
		}
		worst := 0.0
		for _, e := range cmp.Entries {
			r := rep[*e.Player.ProfileID]
			worst = math.Max(worst, math.Abs(r.Elo-e.Stats.Elo))
			if r.App != e.Stats.Points {
				panic("points differ from Compute for " + r.Name)
			}
		}
		if worst > 1e-6 {
			panic(fmt.Sprintf("%s: replay differs from Compute by %g", s.Name, worst))
		}
		fmt.Printf("%-14s %3d games, replay matches Compute\n", s.Name, len(gs))
	}
	b, _ := json.Marshal(seasons)
	if err := os.WriteFile(os.Args[2], b, 0o644); err != nil {
		panic(err)
	}
	s := predict(all)
	fmt.Printf("default settings: favourite won %.0f%% of %d games, prediction score %.4f\n", 100*s.Correct, s.Called, s.LogLoss)
}
