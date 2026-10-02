package api

import (
	"strings"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// showInactive parses the optional flag the way Spring converts booleans.
func showInactive(r *request) (bool, response) {
	values, present := r.URL.Query()["showInactive"]
	if !present {
		return false, nil
	}
	switch strings.ToLower(strings.TrimSpace(strings.Join(values, ","))) {
	case "", "false", "off", "no", "0":
		return false, nil
	case "true", "on", "yes", "1":
		return true, nil
	}
	return false, springError(400)
}

func (s *Server) listPlayers(r *request) response {
	inactive, res := showInactive(r)
	if res != nil {
		return res
	}
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	rows, err := s.q.PlayersInSeason(r.Context(), db.PlayersInSeasonParams{SeasonID: &seasonID, IncludeInactive: inactive})
	if err != nil {
		return internal(err)
	}
	out := make([]playerDTO, len(rows))
	for i, p := range rows {
		out[i] = toPlayerDTO(p)
	}
	return ok(out)
}

// listPlayersExtended returns the season's leaderboard entries (stats
// accumulated over all seasons) for the requested players.
func (s *Server) listPlayersExtended(r *request) response {
	inactive, res := showInactive(r)
	if res != nil {
		return res
	}
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	ids, err := s.q.PlayerIDsInSeason(r.Context(), db.PlayerIDsInSeasonParams{SeasonID: &seasonID, IncludeInactive: inactive})
	if err != nil {
		return internal(err)
	}
	if ids == nil {
		ids = []string{}
	}
	b, res := s.leaderboardFor(r.Context(), s.q, groupDTO{ID: r.path("groupId")}, "season", true, seasonID, ids)
	if _, failed := res.(errorCode); failed {
		return ok([]playerExtendedDTO{})
	}
	if res != nil {
		return res
	}
	return ok(b.entries())
}

func (s *Server) deletePlayer(r *request) response {
	groupID, seasonID := r.path("groupId"), r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	row, err := s.q.GetPlayerWithSeason(r.Context(), r.path("id"))
	if notFound(err) {
		return fail(errPlayerNotFound)
	}
	if err != nil {
		return internal(err)
	}
	if !row.Player.ActiveThisSeason {
		return fail(errPlayerAlreadyDeleted)
	}
	if row.SeasonGroupID == nil {
		return internalf("player %s has no season", row.Player.ID)
	}
	if *row.SeasonGroupID != groupID {
		return fail(errPlayerNotOfGroup)
	}
	if row.SeasonEndDate != nil {
		return fail(errSeasonAlreadyEnded)
	}
	// The event carries the player as it was before deactivation.
	before := toPlayerDTO(row.Player)
	if err := s.q.SetPlayerActive(r.Context(), db.SetPlayerActiveParams{ID: row.Player.ID, ActiveThisSeason: false}); err != nil {
		return internal(err)
	}
	s.hub.Publish(groupID, realtime.Players, "playerDelete", before)
	return ok("OK")
}
