package leaderboard

import "math"

// Elo parameters. The comments explain what each knob does; changing one
// changes every rating the next time a leaderboard is computed.
const (
	StartingElo = 1500
	// eloDivider: rating difference that makes a 10x expected-score ratio.
	eloDivider = 400
	// kTeam: weight of the match result (higher = upsets move ratings more).
	kTeam = 25.0
	// kPerf: weight of a player's share of the team points versus expectation.
	kPerf = 40.0
	// alpha: how much the expected point share follows Elo (0 = everyone equal).
	alpha = 0.5
	// beta: softmax sharpness of the expected share.
	beta = 0.02
	// pseudoPoints: smoothing, so a few points don't swing shares to extremes.
	pseudoPoints = 3.0
	// perfPointsScale: how many points it takes before performance counts fully.
	perfPointsScale = 3.0
	// perfWeightFloor: performance always counts at least this much.
	perfWeightFloor = 0.35
	// capPerPlayer: max rating change per match.
	capPerPlayer = 40.0
	// expected share is clamped to [shareFloor, shareCeil] before renormalizing.
	shareFloor = 0.05
	shareCeil  = 0.9
)

// calculateElo updates the ratings of both teams after one match. Every
// expression keeps the Java implementation's operation order so ratings stay
// identical to what the Java backend stored.
func calculateElo(winningTeam, blueTeam string, bluePoints, redPoints int64, blue, red []*Stats, playerPoints map[string]int64) {
	resultBlue := 0.0
	if winningTeam == blueTeam {
		resultBlue = 1.0
	}
	resultRed := 1.0 - resultBlue

	avgBlue := averageElo(blue)
	avgRed := averageElo(red)

	expShare := map[string]float64{}
	expectedShare(blue, expShare)
	expectedShare(red, expShare)

	actShare := map[string]float64{}
	actualShare(blue, playerPoints, bluePoints, actShare)
	actualShare(red, playerPoints, redPoints, actShare)

	applyDeltas(blue, resultBlue, avgRed, expShare, actShare, bluePoints, redPoints)
	applyDeltas(red, resultRed, avgBlue, expShare, actShare, redPoints, bluePoints)
}

func applyDeltas(players []*Stats, result, avgOpponent float64, expShare, actShare map[string]float64, teamPoints, opponentPoints int64) {
	m := max(0, teamPoints+opponentPoints)
	wPoints := float64(m) / (float64(m) + perfPointsScale)
	wRatio := 0.5
	if teamPoints+opponentPoints > 0 {
		wRatio = float64(teamPoints) / float64(teamPoints+opponentPoints)
	}
	wPerf := math.Max(perfWeightFloor, math.Sqrt(wPoints)*math.Sqrt(wRatio))

	for _, p := range players {
		expVsOpponent := expectedScore(p.Elo, avgOpponent)
		deltaTeam := kTeam * (result - expVsOpponent)
		dShare := actShare[p.PlayerID] - expShare[p.PlayerID]
		deltaPerformance := (kPerf * wPerf) * dShare
		change := math.Max(-capPerPlayer, math.Min(capPerPlayer, deltaTeam+deltaPerformance))
		p.Elo = p.Elo + change
	}
}

func expectedScore(elo, opponentElo float64) float64 {
	return 1.0 / (1.0 + math.Pow(10.0, (opponentElo-elo)/eloDivider))
}

// averageElo is DoubleStream.average(): a compensated (Kahan) sum, starting
// rating for an empty team.
func averageElo(players []*Stats) float64 {
	if len(players) == 0 {
		return StartingElo
	}
	var sum, compensation, simple float64
	for _, p := range players {
		y := p.Elo - compensation
		t := sum + y
		compensation = (t - sum) - y
		sum = t
		simple += p.Elo
	}
	total := sum - compensation
	if math.IsNaN(total) && math.IsInf(simple, 0) {
		total = simple
	}
	return total / float64(len(players))
}

// expectedShare: softmax over Elo blended with an even split, clamped and
// renormalized, so nobody is expected to score 0% or 100% of the team points.
func expectedShare(players []*Stats, out map[string]float64) {
	n := len(players)
	if n == 0 {
		return
	}
	logits := make([]float64, n)
	sumExp := 0.0
	for i, p := range players {
		e := math.Exp(beta * p.Elo)
		logits[i] = e
		sumExp += e
	}
	shares := make([]float64, n)
	sum := 0.0
	for i := range players {
		denominator := 1.0
		if sumExp > 0 {
			denominator = sumExp
		}
		soft := logits[i] / denominator
		blended := (1.0-alpha)*(1.0/float64(n)) + alpha*soft
		blended = math.Max(shareFloor, math.Min(shareCeil, blended))
		shares[i] = blended
		sum += blended
	}
	for i, p := range players {
		if sum == 0 {
			out[p.PlayerID] = 0
		} else {
			out[p.PlayerID] = shares[i] / sum
		}
	}
}

// actualShare is each player's share of the team's own points, smoothed with
// pseudo points spread evenly over the team.
func actualShare(players []*Stats, playerPoints map[string]int64, teamPoints int64, out map[string]float64) {
	n := len(players)
	denominator := float64(teamPoints) + pseudoPoints
	prior := 0.0
	if n > 0 {
		prior = pseudoPoints / float64(n)
	}
	if denominator <= 0 {
		uniform := 1.0 / float64(max(1, n))
		for _, p := range players {
			out[p.PlayerID] = uniform
		}
		return
	}
	for _, p := range players {
		points := float64(playerPoints[p.PlayerID])
		out[p.PlayerID] = (points + prior) / denominator
	}
}
