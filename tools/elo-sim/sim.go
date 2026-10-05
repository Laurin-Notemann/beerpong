package main

// Replays a group's games through the API's own Elo code (elo.go and
// leaderboard.go, copied in by make-page.sh with the tunable constants turned
// into variables), scores how well the ratings predict each next game, and
// searches settings. Every season starts at StartingElo.

import (
	"math"
	"sort"
)

type Params struct {
	K            float64 `json:"k"`
	MarginWeight float64 `json:"marginWeight"`
	PerPoint     float64 `json:"perPoint"`
	TopWeight    float64 `json:"topWeight"`
}

func setParams(p Params) {
	eloK, marginWeight, eloPerPoint, topWeight = p.K, p.MarginWeight, p.PerPoint, p.TopWeight
}

func defaultParams() Params {
	return Params{K: eloK, MarginWeight: marginWeight, PerPoint: eloPerPoint, TopWeight: topWeight}
}

type GamePlayer struct {
	Name  string `json:"name"`
	Own   int64  `json:"own"`   // PointsForScorer of the player's moves
	Bonus int64  `json:"bonus"` // PointsForTeam of the player's moves (a finish)
}
type GameTeam struct {
	Players []GamePlayer `json:"players"`
	Won     bool         `json:"won"`
}
type Game struct {
	Teams []GameTeam `json:"teams"`
}

type OutPlayer struct {
	Name     string  `json:"name"`
	App      int64   `json:"app"`
	Own      int64   `json:"own"`
	Before   float64 `json:"before"`
	After    float64 `json:"after"`
	Result   float64 `json:"result"`
	Hitting  float64 `json:"hitting"`
	Expected float64 `json:"expected"`
}
type OutTeam struct {
	Players []OutPlayer `json:"players"`
	Won     bool        `json:"won"`
	App     int64       `json:"app"`
	AvgApp  float64     `json:"avgApp"`
	Rating  float64     `json:"rating"`
	ExpWin  float64     `json:"expWin"`
}
type OutGame struct {
	Teams      []OutTeam `json:"teams"`
	Gap        float64   `json:"gap"`        // winners' points per player minus losers'
	Scale      float64   `json:"scale"`      // how many close normal wins it counted as
	TeamPoints float64   `json:"teamPoints"` // a team's own points per game before this one
}
type Standing struct {
	Name       string  `json:"name"`
	Elo        float64 `json:"elo"`
	Games      int     `json:"games"`
	Wins       int     `json:"wins"`
	App        int64   `json:"app"`
	ResultSum  float64 `json:"resultSum"`
	HittingSum float64 `json:"hittingSum"`
}
type RunResult struct {
	Games     []OutGame  `json:"games"`
	Standings []Standing `json:"standings"`
}

// points mirrors processMatch: app points (own plus every finish bonus of the
// team) and own points.
func points(t GameTeam) (app, own map[string]int64) {
	var bonus int64
	for _, p := range t.Players {
		bonus += p.Bonus
	}
	app, own = map[string]int64{}, map[string]int64{}
	for _, p := range t.Players {
		app[p.Name] = p.Own + bonus
		own[p.Name] = p.Own
	}
	return app, own
}

// replay runs one season. With record it returns every game and the final
// standings; it always returns the win chance the ratings gave the first
// team before each game, and whether it won.
func replay(games []Game, record bool) (RunResult, []float64, []bool) {
	stats := map[string]*Stats{}
	agg := map[string]*Standing{}
	var order []string
	get := func(n string) *Stats {
		if s, ok := stats[n]; ok {
			return s
		}
		s := FreshStats()
		s.PlayerID = n
		stats[n] = &s
		agg[n] = &Standing{Name: n}
		order = append(order, n)
		return &s
	}
	var res RunResult
	var teamPoints teamPointsAverage
	var preds []float64
	var outcomes []bool
	for _, g := range games {
		if len(g.Teams) != 2 {
			continue
		}
		var side [2][]*Stats
		var ownTotal [2]int64
		app, own := map[string]int64{}, map[string]int64{}
		for k, t := range g.Teams {
			a, o := points(t)
			for _, p := range t.Players {
				side[k] = append(side[k], get(p.Name))
				ownTotal[k] += p.Own
				app[p.Name], own[p.Name] = a[p.Name], o[p.Name]
			}
		}
		rating := [2]float64{teamElo(side[0]), teamElo(side[1])}
		exp := winChance(rating[0], rating[1])
		preds = append(preds, exp)
		outcomes = append(outcomes, g.Teams[0].Won)
		tp := teamPoints.value(ownTotal[0], ownTotal[1])

		before, expected := map[string]float64{}, map[string]float64{}
		for k := 0; k < 2; k++ {
			for i, e := range expectedPoints(side[k], rating[1-k], tp) {
				expected[side[k][i].PlayerID], before[side[k][i].PlayerID] = e, side[k][i].Elo
			}
		}
		avgApp := [2]float64{averagePoints(side[0], app), averagePoints(side[1], app)}
		calculateElo(g.Teams[0].Won, side[0], side[1], app, own, tp)
		teamPoints.add(ownTotal[0])
		teamPoints.add(ownTotal[1])
		if !record {
			continue
		}
		gap := avgApp[0] - avgApp[1]
		resultBlue := 1.0
		if !g.Teams[0].Won {
			gap, resultBlue = -gap, 0
		}
		scale := marginScale(gap)
		deltaBlue := eloK * scale * (resultBlue - exp)
		og := OutGame{Gap: gap, Scale: scale, TeamPoints: tp}
		for k := 0; k < 2; k++ {
			e, d := exp, deltaBlue
			if k == 1 {
				e, d = 1-exp, -deltaBlue
			}
			ot := OutTeam{Won: g.Teams[k].Won, AvgApp: avgApp[k], Rating: rating[k], ExpWin: e}
			for _, s := range side[k] {
				n := s.PlayerID
				hitting := s.Elo - before[n] - d
				ot.App += app[n]
				ot.Players = append(ot.Players, OutPlayer{Name: n, App: app[n], Own: own[n], Before: before[n], After: s.Elo,
					Result: d, Hitting: hitting, Expected: expected[n]})
				a := agg[n]
				a.Games++
				if g.Teams[k].Won {
					a.Wins++
				}
				a.App += app[n]
				a.ResultSum += d
				a.HittingSum += hitting
			}
			og.Teams = append(og.Teams, ot)
		}
		res.Games = append(res.Games, og)
	}
	if record {
		for _, n := range order {
			a := agg[n]
			a.Elo = stats[n].Elo
			res.Standings = append(res.Standings, *a)
		}
		sort.SliceStable(res.Standings, func(i, j int) bool { return res.Standings[i].Elo > res.Standings[j].Elo })
	}
	return res, preds, outcomes
}

type Score struct {
	LogLoss float64 `json:"logLoss"` // lower is better; a coin flip is 0.693
	Correct float64 `json:"correct"` // share of games the favourite won (even games skipped)
	Called  int     `json:"called"`
	Games   int     `json:"games"`
}

// predict scores the ratings on every game of every season, each season from
// StartingElo, using only the ratings from before the game.
func predict(seasons [][]Game) Score {
	var s Score
	right := 0
	for _, games := range seasons {
		_, preds, outcomes := replay(games, false)
		for i, p := range preds {
			p = math.Min(math.Max(p, 1e-6), 1-1e-6)
			if outcomes[i] {
				s.LogLoss -= math.Log(p)
			} else {
				s.LogLoss -= math.Log(1 - p)
			}
			if math.Abs(p-0.5) > 1e-9 {
				s.Called++
				if (p > 0.5) == outcomes[i] {
					right++
				}
			}
			s.Games++
		}
	}
	if s.Games > 0 {
		s.LogLoss /= float64(s.Games)
	}
	if s.Called > 0 {
		s.Correct = float64(right) / float64(s.Called)
	}
	return s
}

type Best struct {
	Params Params `json:"params"`
	Score  Score  `json:"score"`
	Tried  int    `json:"tried"`
}

// search tries a grid of settings and keeps the one that predicts best.
func search(seasons [][]Game) Best {
	best := Best{Score: Score{LogLoss: math.Inf(1)}}
	for _, k := range []float64{150, 200, 250, 300, 350, 400, 500} {
		for _, mw := range []float64{0, 0.25, 0.5, 0.75, 1} {
			for _, pp := range []float64{0, 10, 20, 25, 30, 40, 60} {
				for _, tw := range []float64{0, 0.25, 0.5, 0.75, 1} {
					p := Params{K: k, MarginWeight: mw, PerPoint: pp, TopWeight: tw}
					setParams(p)
					s := predict(seasons)
					best.Tried++
					if s.LogLoss < best.Score.LogLoss {
						best.Params, best.Score = p, s
					}
				}
			}
		}
	}
	return best
}
