package leaderboard

import "math"

// Elo rates how well players score against the players they play with and
// against. Before a game the ratings split it: every player is expected a
// share of all the own points the game will have (Normal 1, Bomb 2, a finish
// move 1, as the group's rules say; the finish bonus isn't anyone's own). A
// stronger player's share is bigger, and so is a stronger team's. Both teams
// throw equally often and a team's players take turns, so in a 3v2 each of
// the pair throws 1.5 times as often and their shares are that much bigger.
// A match moves a rating twice:
//
//   - Hitting: own points against the share of the points the game actually
//     had (a ring ends it early, a live game is under way), scaled to what an
//     average player in that spot scores in a full game, so a 1v1 and a 2v2
//     count alike.
//   - Result: win or loss against the team's chance to reach 10 cups first
//     at these strengths. Everyone on a team gets the same. A ring win counts
//     more, by the group's ring bonus against its normal finish bonus.
//
// A player who keeps scoring above their share rises until their share is
// what they score. Every season starts at StartingElo; the all-time board
// replays every season from it once, each match with its season's weights.
const (
	StartingElo = 1500
	// eloDivider: at Swing 1, the rating gap between a player and one who
	// scores 10 times as often in the same throws.
	eloDivider = 4000.0
	// gameCups: cups a team takes to win.
	gameCups = 10
	// startingGamePoints: own points both teams score in a full game, before
	// the season has one to average (Sackverein: about 19).
	startingGamePoints = 19.0
)

// EloParams are the weights of the Elo, a season setting.
type EloParams struct {
	// K: rating for scoring, above your share, as many points as an average
	// player in your spot scores in a full game (at Swing 1).
	K float64
	// KR: rating at stake on the result; a win gives KR × (1 − win chance).
	KR float64
	// RingWeight: a ring win counts (ring bonus / normal finish bonus) to the
	// power of RingWeight: 0 like a normal win, 0.5 the square root, 1 the
	// bonus ratio.
	RingWeight float64
	// Swing scales how far ratings move and spread without changing who's
	// ahead: K, KR and the rating gap of a strength ratio all grow with it.
	Swing float64
}

// DefaultElo is a new season's weights. On Sackverein's games a game moves a
// player by about 85 and at most about 240.
var DefaultElo = EloParams{K: 40, KR: 40, RingWeight: 0.5, Swing: 3}

func (p EloParams) swing() float64 {
	if p.Swing <= 0 {
		return 1
	}
	return p.Swing
}

// eloGame is how one match moved the ratings, for Input.Trace.
type eloGame struct {
	winChance float64    // blue's
	result    [2]float64 // per player of each team
	share     [2][]float64
	expected  [2][]float64
	hitting   [2][]float64
}

// calculateElo updates the ratings of both teams after one match. resultBlue
// is 1 when blue won and 0 when red won; a projected live match that is tied
// counts as a draw (0.5). own are the players' own points, ring what the
// result counts (ringFactor) and full the own points of an average full game.
func calculateElo(p EloParams, resultBlue, ring float64, teams [2][]*Stats, own map[string]int64, full float64) eloGame {
	var g eloGame
	if len(teams[0]) == 0 || len(teams[1]) == 0 {
		return g
	}
	swing := p.swing()
	strength := func(s *Stats) float64 { return math.Pow(10, (s.Elo-StartingElo)/(eloDivider*swing)) }

	// each player's weight: strength × share of the team's throws (2 / team
	// size, so a 2v2 player is 1)
	var total, points float64
	var teamStrength [2]float64
	weights := [2][]float64{}
	for k, team := range teams {
		for _, s := range team {
			w := strength(s) * 2 / float64(len(team))
			weights[k] = append(weights[k], w)
			total += w
			teamStrength[k] += strength(s) / float64(len(team))
			points += float64(own[s.PlayerID])
		}
	}
	g.winChance = winChance(teamStrength[0] / (teamStrength[0] + teamStrength[1]))
	g.result[0] = p.KR * swing * ring * (resultBlue - g.winChance)
	g.result[1] = -g.result[0]

	for k, team := range teams {
		average := full / float64(2*len(team))
		for i, s := range team {
			share := weights[k][i] / total
			expected := share * points
			hitting := p.K * swing * (float64(own[s.PlayerID]) - expected) / average
			g.share[k] = append(g.share[k], share)
			g.expected[k] = append(g.expected[k], expected)
			g.hitting[k] = append(g.hitting[k], hitting)
		}
	}
	for k, team := range teams {
		for i, s := range team {
			s.Elo += g.result[k] + g.hitting[k][i]
		}
	}
	return g
}

// winChance is the chance that a team that scores a share q of the cups
// reaches gameCups first.
func winChance(q float64) float64 {
	sum, ways := 0.0, 1.0 // ways: (gameCups-1+k choose k)
	for k := range gameCups {
		if k > 0 {
			ways = ways * float64(gameCups-1+k) / float64(k)
		}
		sum += ways * math.Pow(q, gameCups) * math.Pow(1-q, float64(k))
	}
	return sum
}

// ringFactor is what a ring win's result counts: its team bonus against a
// normal finish's, to the power of RingWeight, never less than a normal win.
func ringFactor(p EloParams, ringBonus, normalBonus int32) float64 {
	if ringBonus <= normalBonus || normalBonus <= 0 {
		return 1
	}
	return math.Pow(float64(ringBonus)/float64(normalBonus), p.RingWeight)
}

// fullGames averages the own points both teams scored in the full games so
// far: a ring ends a game early and a live game is under way. The season's
// first game has nothing to average and uses startingGamePoints.
type fullGames struct {
	sum   float64
	games int
}

func (a *fullGames) value() float64 {
	if a.games == 0 {
		return startingGamePoints
	}
	return a.sum / float64(a.games)
}

func (a *fullGames) add(points int64) {
	a.sum += float64(points)
	a.games++
}
