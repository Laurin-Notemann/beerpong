package leaderboard

import "math"

// Score is how well the ratings from before each game picked its winner.
type Score struct {
	LogLoss float64 // lower is better; a coin flip is 0.693
	Correct float64 // share of games the favourite won (even games skipped)
	Called  int     // games with a favourite
	Games   int
}

// Predict scores the Elo with p on every game of seasons, each a season's
// Input.
func Predict(seasons []Input, p EloParams) (Score, error) {
	var s Score
	right := 0
	for _, in := range seasons {
		in.Elo, in.Trace = &p, true
		res, err := Compute(in)
		if err != nil {
			return Score{}, err
		}
		for _, g := range res.Games {
			chance := math.Min(math.Max(g.Teams[0].WinChance, 1e-6), 1-1e-6)
			won := g.Teams[0].Won
			if won {
				s.LogLoss -= math.Log(chance)
			} else {
				s.LogLoss -= math.Log(1 - chance)
			}
			if math.Abs(chance-0.5) > 1e-9 {
				s.Called++
				if (chance > 0.5) == won {
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
	return s, nil
}

// Search tries a grid of weights on seasons and returns the one that
// predicts best, its score and how many it tried.
func Search(seasons []Input) (EloParams, Score, int, error) {
	best, bestScore, tried := DefaultElo, Score{LogLoss: math.Inf(1)}, 0
	for _, k := range []float64{150, 200, 250, 300, 350, 400, 500} {
		for _, mw := range []float64{0, 0.25, 0.5, 0.75, 1} {
			for _, pp := range []float64{0, 10, 20, 25, 30, 40, 60} {
				for _, tw := range []float64{0, 0.25, 0.5, 0.75, 1} {
					p := EloParams{K: k, MarginWeight: mw, PerPoint: pp, TopWeight: tw}
					s, err := Predict(seasons, p)
					if err != nil {
						return EloParams{}, Score{}, tried, err
					}
					tried++
					if s.LogLoss < bestScore.LogLoss {
						best, bestScore = p, s
					}
				}
			}
		}
	}
	return best, bestScore, tried, nil
}
