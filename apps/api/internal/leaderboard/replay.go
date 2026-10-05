package leaderboard

import (
	"errors"
	"sort"
)

// ErrNoMatch is returned when the match to replay isn't in the input.
var ErrNoMatch = errors.New("match not found")

// Replay rates the match matchID of in as each of steps and then as stored,
// every step from the ratings before the match: a live match's log, move by
// move, as if it had stopped there. Steps take the match's date and weights.
func Replay(in Input, matchID string, steps []Match) ([]Game, error) {
	matches := make([]Match, len(in.Matches))
	copy(matches, in.Matches)
	sort.SliceStable(matches, func(i, j int) bool { return matches[i].Date.Before(matches[j].Date) })
	at := -1
	for i, m := range matches {
		if m.ID == matchID {
			at = i
			break
		}
	}
	if at < 0 {
		return nil, ErrNoMatch
	}
	target, before := matches[at], matches[:at:at]
	out := make([]Game, 0, len(steps)+1)
	for _, step := range append(steps, target) {
		step.Date, step.Elo = target.Date, target.Elo
		run := in
		run.Matches, run.Trace = append(before, step), true
		res, err := Compute(run)
		if err != nil {
			return nil, err
		}
		out = append(out, res.Games[len(res.Games)-1])
	}
	return out, nil
}
