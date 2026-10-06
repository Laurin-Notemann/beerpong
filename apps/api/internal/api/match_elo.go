package api

import "github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"

// matchEloDTO is how one match moved its players' season Elo, for the app's
// match list.
type matchEloDTO struct {
	MatchID string              `json:"matchId"`
	Players []matchEloPlayerDTO `json:"players"`
}

type matchEloPlayerDTO struct {
	PlayerID string  `json:"playerId"`
	Change   float64 `json:"change"` // the rating after the match minus before
}

// listMatchElo answers GET .../matches/elo: every match of the season with
// each player's Elo change, from the same replay as the season leaderboard,
// in the order the matches were rated.
func (s *Server) listMatchElo(r *request) response {
	ctx := r.Context()
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	group, err := s.q.GetGroup(ctx, r.path("groupId"))
	if notFound(err) {
		return fail(errGroupNotFound)
	}
	if err != nil {
		return internal(err)
	}
	li, res := s.leaderboardInput(ctx, s.q, toGroupDTO(group), "season", false, seasonID, nil)
	if res != nil {
		return res
	}
	li.in.Trace = true
	// a match without a finish fails it, like the season leaderboard
	result, err := leaderboard.Compute(li.in)
	if err != nil {
		return internal(err)
	}

	playerOf := map[string]string{} // by team member
	for _, m := range li.in.Matches {
		for _, tm := range m.Members {
			playerOf[tm.ID] = tm.PlayerID
		}
	}
	out := make([]matchEloDTO, len(result.Games))
	for i, g := range result.Games {
		players := []matchEloPlayerDTO{}
		for _, team := range g.Teams {
			for _, p := range team.Players {
				players = append(players, matchEloPlayerDTO{PlayerID: playerOf[p.MemberID], Change: p.After - p.Before})
			}
		}
		out[i] = matchEloDTO{MatchID: g.MatchID, Players: players}
	}
	return ok(out)
}
