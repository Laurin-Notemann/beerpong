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
//     below what the player was expected to score is worth eloPerPoint. The
//     expectation is set before the game, from the ratings alone: a team's
//     points per game split over its players, more against weaker
//     opponents. A teammate's points don't change it. The finish bonus
//     belongs to every teammate and only counts in the result.
//
// Teams throw equally often and players take turns. Every season starts at
// StartingElo. The constants were tuned on Sackverein's games with the
// simulator in tools/elo-sim; changing one changes every rating the next time
// a leaderboard is computed.
const (
	StartingElo = 1500
	// eloDivider: rating gap that makes a 10x win-chance ratio. Ten times the
	// usual 400, with a ten times larger K, so a game moves a rating by about
	// 100 to 250.
	eloDivider = 4000.0
	// eloK: rating at stake on a close normal win between equal teams (×0.5).
	eloK = 350.0
	// marginWeight: how much the points gap scales the result (0 = only
	// win or loss). The scale is ((1 + gap) / (1 + marginBase))^weight.
	marginWeight = 0.5
	// marginBase: points gap per player of a typical close normal win
	// (2v2, 10:9), the game that counts exactly once.
	marginBase = 4.0
	// eloPerPoint: rating for each own point above or below expectation.
	eloPerPoint = 25.0
	// topWeight: 0 = a team is as strong as its average player, 1 = as
	// its strongest player. Halfway predicted Sackverein's games better than
	// the plain average.
	topWeight = 0.5
)

// calculateElo updates the ratings of both teams after one match. points are the
// app's points per player, own their points without the finish bonus, and
// teamPoints what a team scores on its own in an average game this season.
func calculateElo(blueWon bool, blue, red []*Stats, points, own map[string]int64, teamPoints float64) {
	blueRating, redRating := teamElo(blue), teamElo(red)
	expectedBlue := winChance(blueRating, redRating)

	gap := averagePoints(blue, points) - averagePoints(red, points)
	resultBlue := 1.0
	if !blueWon {
		resultBlue, gap = 0, -gap
	}
	delta := eloK * marginScale(gap) * (resultBlue - expectedBlue)

	// both expectations come from the ratings before the game
	blueExpected := expectedPoints(blue, redRating, teamPoints)
	redExpected := expectedPoints(red, blueRating, teamPoints)
	applyElo(blue, delta, own, blueExpected)
	applyElo(red, -delta, own, redExpected)
}

func applyElo(players []*Stats, teamDelta float64, own map[string]int64, expected []float64) {
	for i, p := range players {
		p.Elo += teamDelta + eloPerPoint*(float64(own[p.PlayerID])-expected[i])
	}
}

// expectedPoints is what each player should score on their own: the team's
// points per game split over its players, times twice their win chance
// against the opponents (so the plain split against an equal team).
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
func marginScale(gap float64) float64 {
	return math.Pow((1+math.Max(0, gap))/(1+marginBase), marginWeight)
}

func teamElo(players []*Stats) float64 {
	if len(players) == 0 {
		return StartingElo
	}
	sum, top := 0.0, players[0].Elo
	for _, p := range players {
		sum += p.Elo
		top = math.Max(top, p.Elo)
	}
	return (1-topWeight)*sum/float64(len(players)) + topWeight*top
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

// teamPointsAverage is what a team scored on its own per game so far this
// season (Sackverein: about 9, whatever the team size). The season's first
// game has nothing to average, so it uses its own two teams.
type teamPointsAverage struct {
	sum   float64
	teams int
}

func (a *teamPointsAverage) value(blue, red int64) float64 {
	if a.teams == 0 {
		return float64(blue+red) / 2
	}
	return a.sum / float64(a.teams)
}

func (a *teamPointsAverage) add(points int64) {
	a.sum += float64(points)
	a.teams++
}
