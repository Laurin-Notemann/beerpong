package leaderboard

import "math"

// Elo rates players on the same points the app shows, so a ring finish counts
// here as much as it does for average points. Cups play no part. A match moves
// a rating twice:
//
//   - Result: win or loss against the win chance of the two team ratings,
//     scaled by how big the points gap per player was. A close normal win
//     counts once; a ring or a 10:0 count about 1.4 times. Everyone on a team
//     gets the same change.
//   - Hitting: each own point (Normal 1, Bomb 2, a finish move 1) above or
//     below what the player was expected to score is worth PerPoint. The
//     expectation is set before the game, from the ratings alone: a team's
//     points per full game split over its players, more against weaker
//     opponents. A teammate's points don't change it. It counts for the
//     share of a game that was played: a ring ends the game early, so only
//     the cups before it are expected, and a live game expects its cups so
//     far. The finish bonus belongs to every teammate and only counts in the
//     result.
//
// Teams throw equally often and players take turns. Every season starts at
// StartingElo; the all-time board replays every season from it once.
// DefaultElo was tuned on Sackverein's games with beerpong-var
// (the Elo simulator); changing it changes every rating the next time a
// leaderboard is computed.
const (
	StartingElo = 1500
	// eloDivider: rating gap that makes a 10x win-chance ratio. Ten times the
	// usual 400, with a ten times larger K, so a game's result moves a rating
	// by about 50 to 150.
	eloDivider = 4000.0
	// marginBase: points gap per player of a typical close normal win
	// (2v2, 10:9), the game that counts exactly once.
	marginBase = 4.0
	// gameCups: cups a team takes to win a full game.
	gameCups = 10.0
	// startingTeamPoints: what a team is expected to score on its own in the
	// season's first game, before there's an average (Sackverein's full
	// games: about 9.7).
	startingTeamPoints = 9.5
)

// EloParams are the weights of the Elo. Leaderboards use DefaultElo; the
// simulator tries others.
type EloParams struct {
	// K: rating at stake on a close normal win between equal teams (×0.5).
	K float64
	// MarginWeight: how much the points gap scales the result (0 = only win
	// or loss). The scale is ((1 + gap) / (1 + marginBase))^MarginWeight.
	MarginWeight float64
	// PerPoint: rating for each own point above or below expectation.
	PerPoint float64
	// TopWeight: 0 = a team is as strong as its average player, 1 = as its
	// strongest player. A team's points are its players' hits added up, and
	// leaning toward the strongest player made a carrier's losses cost more.
	TopWeight float64
}

// DefaultElo leans on hitting more than on the result: on Sackverein's games
// the favourite wins only about 55% of the time, so one result says little
// about a player, while every cup does. It predicts winners as well as the
// heavier result weights did.
var DefaultElo = EloParams{K: 175, MarginWeight: 0.5, PerPoint: 50, TopWeight: 0}

// eloGame is how one match moved the ratings, for Input.Trace.
type eloGame struct {
	rating    [2]float64 // blue, red
	winChance float64    // blue's
	gap       float64    // winners' points per player minus losers'
	scale     float64
	delta     float64 // blue's result; red gets -delta
	expected  [2][]float64
}

// calculateElo updates the ratings of both teams after one match. resultBlue
// is 1 when blue won and 0 when red won; a projected live match that is tied
// counts as a draw (0.5, no margin). points are the app's points per player,
// own their points without the finish bonus, teamPoints what a team scores on
// its own in an average full game this season, and share how much of a game
// was played (1 for a full one).
func calculateElo(p EloParams, resultBlue float64, blue, red []*Stats, points, own map[string]int64, teamPoints, share float64) eloGame {
	blueRating, redRating := teamElo(p, blue), teamElo(p, red)
	expectedBlue := winChance(blueRating, redRating)

	// the winner's points gap per player
	gap := averagePoints(blue, points) - averagePoints(red, points)
	switch resultBlue {
	case 0:
		gap = -gap
	case 0.5:
		gap = 0
	}
	scale := marginScale(p, gap)
	delta := p.K * scale * (resultBlue - expectedBlue)

	// both expectations come from the ratings before the game
	blueExpected := expectedPoints(blue, redRating, teamPoints)
	redExpected := expectedPoints(red, blueRating, teamPoints)
	applyElo(p, blue, delta, own, blueExpected, share)
	applyElo(p, red, -delta, own, redExpected, share)
	return eloGame{rating: [2]float64{blueRating, redRating}, winChance: expectedBlue, gap: gap, scale: scale,
		delta: delta, expected: [2][]float64{blueExpected, redExpected}}
}

func applyElo(p EloParams, players []*Stats, teamDelta float64, own map[string]int64, expected []float64, share float64) {
	for i, s := range players {
		s.Elo += teamDelta + hitting(p, own[s.PlayerID], expected[i], share)
	}
}

// hitting is the rating for own points above or below the expectation of the
// part of a game that was played.
func hitting(p EloParams, own int64, expected, share float64) float64 {
	return p.PerPoint * (float64(own) - expected*share)
}

// gameShare is how much of a full game a match was. A game won with a normal
// finish is a full one. A ring takes its cups in one throw, so the game ended
// after the winners' cups before it. A live game is as far as the team with
// more cups, never assuming it will end with a ring.
func gameShare(inProgress bool, blueCups, redCups, winnerCups, finishCups int64) float64 {
	switch {
	case inProgress:
		return math.Min(1, float64(max(blueCups, redCups))/gameCups)
	case finishCups > 0:
		return math.Min(1, float64(winnerCups-finishCups)/gameCups)
	default:
		return 1
	}
}

// expectedPoints is what each player should score on their own in a full
// game: the team's points per game split over its players, times twice their
// win chance against the opponents (so the plain split against an equal
// team).
func expectedPoints(players []*Stats, opponentRating, teamPoints float64) []float64 {
	out := make([]float64, len(players))
	for i, p := range players {
		out[i] = teamPoints / float64(len(players)) * 2 * winChance(p.Elo, opponentRating)
	}
	return out
}

// winChance is the chance that a team rated rating beats one rated
// opponent.
func winChance(rating, opponent float64) float64 {
	return 1.0 / (1.0 + math.Pow(10.0, (opponent-rating)/eloDivider))
}

// marginScale is how much a win by gap points per player counts compared
// with a close normal win.
func marginScale(p EloParams, gap float64) float64 {
	return math.Pow((1+math.Max(0, gap))/(1+marginBase), p.MarginWeight)
}

func teamElo(p EloParams, players []*Stats) float64 {
	if len(players) == 0 {
		return StartingElo
	}
	sum, top := 0.0, players[0].Elo
	for _, s := range players {
		sum += s.Elo
		top = math.Max(top, s.Elo)
	}
	return (1-p.TopWeight)*sum/float64(len(players)) + p.TopWeight*top
}

func averagePoints(players []*Stats, points map[string]int64) float64 {
	if len(players) == 0 {
		return 0
	}
	var sum int64
	for _, p := range players {
		sum += points[p.PlayerID]
	}
	return float64(sum) / float64(len(players))
}

// teamPointsAverage is what a team scored on its own per full game so far
// this season (Sackverein: about 9.7, whatever the team size). Only finished
// full games count: a ring or a live game ends early. The season's first game
// has nothing to average and uses startingTeamPoints.
type teamPointsAverage struct {
	sum   float64
	teams int
}

func (a *teamPointsAverage) value() float64 {
	if a.teams == 0 {
		return startingTeamPoints
	}
	return a.sum / float64(a.teams)
}

func (a *teamPointsAverage) add(points int64) {
	a.sum += float64(points)
	a.teams++
}
