package api

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"
)

func (s *Server) leaderboard(r *request) response {
	query := r.URL.Query()
	scopes, hasScope := query["scope"]
	if !hasScope {
		return springError(400)
	}
	scope := strings.Join(scopes, ",")
	var seasonID *string
	if values, present := query["seasonId"]; present {
		seasonID = ptr(strings.Join(values, ","))
	}

	ctx := r.Context()
	groupID := r.path("groupId")
	group, err := s.q.GetGroup(ctx, groupID)
	if notFound(err) {
		return fail(errGroupNotFound)
	}
	if err != nil {
		return internal(err)
	}
	switch {
	case scope != "season" && scope != "today" && scope != "all-time":
		return fail(errLeaderboardScopeNotFound)
	case scope == "season" && seasonID == nil:
		return fail(errLeaderboardSeasonNotFound)
	case scope == "season":
		exists, err := s.q.SeasonExists(ctx, *seasonID)
		if err != nil {
			return internal(err)
		}
		if !exists {
			return fail(errSeasonNotFound)
		}
		if res := s.seasonOfGroup(r, *seasonID); res != nil {
			return res
		}
	}

	board, res := s.leaderboardFor(ctx, s.q, toGroupDTO(group), scope, false, deref(seasonID), nil)
	if res != nil {
		return res
	}
	return ok(board.dto())
}

type board struct {
	active     []*leaderboard.Entry // entries shown (all of them for all-time)
	numMatches int64
	startedAt  *time.Time
	seasons    map[string]seasonDTO // season of every entry's player
}

func (b board) dto() leaderboardDTO {
	entries := b.entries()
	return leaderboardDTO{NumPlayers: int64(len(entries)), NumMatches: b.numMatches, StartedAt: utc(b.startedAt), Entries: entries}
}

func (b board) entries() []playerExtendedDTO {
	out := make([]playerExtendedDTO, len(b.active))
	for i, e := range b.active {
		st := e.Stats
		out[i] = playerExtendedDTO{
			ID:               e.Player.ID,
			ProfileID:        e.Player.ProfileID,
			Season:           b.seasons[e.Player.SeasonID],
			ActiveThisSeason: e.Player.Active,
			Statistics: &statisticsDTO{
				Points: st.Points, Matches: st.Matches, Wins: st.Wins, Moves: st.Moves, TotalTeamSize: st.TotalTeamSize,
				AvgPointsPerMatch: st.AvgPointsPerMatch, AvgTeamSize: st.AvgTeamSize, Elo: st.Elo,
			},
		}
	}
	return out
}

// leaderboardFor builds a board for the scope. keepStored starts from the
// players' stored statistics (used when carrying stats into a new season).
// playerIDs, when not nil, limits the board to those players.
func (s *Server) leaderboardFor(ctx context.Context, q *db.Queries, group groupDTO, scope string, keepStored bool, seasonID string, playerIDs []string) (board, response) {
	var (
		matches   []db.Match
		players   []playerRow
		startedAt *time.Time
		err       error
	)
	switch scope {
	case "all-time":
		if group.ActiveSeasonID == nil {
			return board{}, fail(errGeneric)
		}
		if matches, err = q.MatchesBySeason(ctx, group.ActiveSeasonID); err != nil {
			return board{}, internal(err)
		}
		rows, err := q.PlayersWithStatsInGroup(ctx, &group.ID)
		if err != nil {
			return board{}, internal(err)
		}
		for _, row := range rows {
			if playerIDs == nil || contains(playerIDs, row.ID) {
				players = append(players, playerRow(row))
			}
		}
		startedAt = group.CreatedAt
	case "season", "today":
		if scope == "today" {
			if group.ActiveSeasonID == nil {
				return board{}, fail(errGroupNoRunningSeason)
			}
			seasonID = *group.ActiveSeasonID
		}
		sn, found, err := s.loadSeason(ctx, q, seasonID)
		if err != nil {
			return board{}, internal(err)
		}
		if !found {
			if scope == "today" {
				return board{}, fail(errGroupNoRunningSeason)
			}
			return board{}, fail(errSeasonNotFound)
		}
		if scope == "today" {
			since, err := dayStart(s.now(), sn.Settings)
			if err != nil {
				return board{}, internal(err)
			}
			matches, err = q.MatchesBySeasonSince(ctx, db.MatchesBySeasonSinceParams{SeasonID: &sn.ID, Date: &since})
		} else {
			matches, err = q.MatchesBySeason(ctx, &sn.ID)
		}
		if err != nil {
			return board{}, internal(err)
		}
		rows, err := q.PlayersWithStatsInSeason(ctx, db.PlayersWithStatsInSeasonParams{SeasonID: &sn.ID, PlayerIds: playerIDs})
		if err != nil {
			return board{}, internal(err)
		}
		for _, row := range rows {
			players = append(players, playerRow(row))
		}
		startedAt = sn.StartDate
	default:
		return board{}, fail(errLeaderboardScopeNotFound)
	}

	full, err := s.loadFullMatches(ctx, q, matches)
	if err != nil {
		return board{}, internal(err)
	}
	in := leaderboard.Input{
		KeepStoredStats: scope == "all-time" || keepStored,
		RuleMoves:       map[string]leaderboard.RuleMove{},
		ProfileOf:       map[string]string{},
	}
	seasons := map[string]seasonDTO{}
	for _, p := range players {
		in.Players = append(in.Players, p.player())
		if _, seen := seasons[p.SeasonID]; !seen {
			seasons[p.SeasonID] = p.season()
		}
	}
	var memberPlayers, moveIDs []string
	for _, m := range full {
		in.Matches = append(in.Matches, m.input())
		for _, tm := range m.members {
			memberPlayers = append(memberPlayers, deref(tm.PlayerID))
		}
		for _, mv := range m.moves {
			moveIDs = append(moveIDs, deref(mv.MoveID))
		}
	}
	if len(moveIDs) > 0 {
		moves, err := q.RuleMovesByIDs(ctx, moveIDs)
		if err != nil {
			return board{}, internal(err)
		}
		for _, m := range moves {
			in.RuleMoves[m.ID] = leaderboard.RuleMove{PointsForScorer: m.PointsForScorer, PointsForTeam: m.PointsForTeam, Finishing: m.FinishingMove}
		}
	}
	if len(memberPlayers) > 0 {
		rows, err := q.ProfileIDsOfPlayers(ctx, memberPlayers)
		if err != nil {
			return board{}, internal(err)
		}
		for _, row := range rows {
			if row.ProfileID == nil {
				return board{}, internalf("player %s has no profile", row.ID)
			}
			in.ProfileOf[row.ID] = *row.ProfileID
		}
	}

	result, err := leaderboard.Compute(in)
	if err != nil {
		return board{}, internal(err)
	}
	b := board{numMatches: result.NumMatches, startedAt: startedAt, seasons: seasons}
	for _, e := range result.Entries {
		if scope == "all-time" || e.Player.Active {
			b.active = append(b.active, e)
		}
	}
	if scope == "all-time" {
		past, err := q.CountMatchesInPastSeasons(ctx, &group.ID)
		if err != nil {
			return board{}, internal(err)
		}
		b.numMatches += past
	}
	return b, nil
}

// dayStart is when "today" began for the daily leaderboard.
func dayStart(now time.Time, st *settings) (time.Time, error) {
	if st == nil || st.DailyLeaderboard == nil {
		return time.Time{}, errors.New("season has no daily leaderboard setting")
	}
	switch *st.DailyLeaderboard {
	case 0: // RESET_AT_MIDNIGHT
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()), nil
	case 2: // LAST_24_HOURS
		return now.Add(-24 * time.Hour), nil
	default: // WAKE_TIME: the last time the wake time passed
		var h, m int
		if _, err := fmt.Sscanf(st.WakeTime, "%d:%d", &h, &m); err != nil {
			return time.Time{}, err
		}
		wake := time.Date(now.Year(), now.Month(), now.Day(), h, m, 0, 0, now.Location())
		if now.Before(wake) {
			wake = wake.AddDate(0, 0, -1)
		}
		return wake, nil
	}
}

// playerRow is a player with statistics and season, from either players query.
type playerRow db.PlayersWithStatsInSeasonRow

func (p playerRow) player() leaderboard.Player {
	return leaderboard.Player{
		ID:        p.ID,
		ProfileID: p.ProfileID,
		SeasonID:  p.SeasonID,
		SeasonEnd: p.SeasonEndDate,
		Active:    p.ActiveThisSeason,
		Stored: leaderboard.Stats{
			Points: p.Points, Matches: p.Matches, Wins: deref(p.Wins), Moves: p.Moves, TotalTeamSize: p.TotalTeamSize,
			AvgPointsPerMatch: p.AvgPointsPerMatch, AvgTeamSize: p.AvgTeamSize, Elo: p.Elo,
		},
	}
}

// season is the player's season as Java mapped it inside PlayerDtoExtended:
// without groupId and createdById.
func (p playerRow) season() seasonDTO {
	sn := season{ID: p.SeasonID, Name: p.SeasonName, StartDate: p.SeasonStartDate, EndDate: p.SeasonEndDate}
	if p.MinTeamSize != nil {
		sn.Settings = &settings{
			MinMatchesToQualify: deref(p.MinMatchesToQualify),
			MinTeamSize:         deref(p.MinTeamSize),
			MaxTeamSize:         deref(p.MaxTeamSize),
			RankingAlgorithm:    p.RankingAlgorithm,
			DailyLeaderboard:    p.DailyLeaderboard,
			WakeTime:            p.WakeTime,
		}
	}
	return sn.dto()
}

func contains(list []string, v string) bool {
	for _, item := range list {
		if item == v {
			return true
		}
	}
	return false
}
