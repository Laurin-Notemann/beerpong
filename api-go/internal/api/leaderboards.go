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
	group, scope, seasonID, res := s.leaderboardQuery(r)
	if res != nil {
		return res
	}
	board, res := s.leaderboardFor(r.Context(), s.q, group, scope, false, seasonID, nil)
	if res != nil {
		return res
	}
	return ok(board.dto())
}

// maxProjectedMatches caps the live matches one projection counts.
const maxProjectedMatches = 20

// leaderboardProjection is the leaderboard with live matches counted as if
// they ended now (leaderboard.Match.Projected), for screens that show the
// standings changing during a game. The client sends their teams in the
// match create format, since only clients reduce a live match's op log.
// Nothing is stored.
func (s *Server) leaderboardProjection(r *request) response {
	group, scope, seasonID, res := s.leaderboardQuery(r)
	if res != nil {
		return res
	}
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	matches, err := parseProjectedMatches(body, s.now())
	if err != nil {
		return fail(errLeaderboardInvalidProjection)
	}
	board, res := s.leaderboardFor(r.Context(), s.q, group, scope, false, seasonID, nil, matches...)
	if res != nil {
		return res
	}
	return ok(board.dto())
}

// parseProjectedMatches reads {"matches": [{"teams": [blue, red]}]}: two
// teams each, with players and their move counts.
func parseProjectedMatches(body any, now time.Time) ([]leaderboard.Match, error) {
	o, err := asObject(body)
	if err != nil {
		return nil, err
	}
	list, present, err := o.list("matches")
	if err != nil || !present || len(list) > maxProjectedMatches {
		return nil, errors.New("matches missing or too many")
	}
	out := make([]leaderboard.Match, len(list))
	for i, raw := range list {
		in, err := parseMatchInput(raw)
		if err != nil || len(in.teams) != 2 {
			return nil, errors.New("a projected match needs two teams")
		}
		id := fmt.Sprintf("projected-%d", i)
		m := leaderboard.Match{ID: id, Date: now, Projected: true}
		for t, team := range in.teams {
			if team == nil || team.members == nil {
				return nil, errNullInMatch
			}
			teamID := fmt.Sprintf("%s-team-%d", id, t)
			m.TeamIDs = append(m.TeamIDs, teamID)
			for j, member := range team.members {
				if member == nil || member.playerID == nil || member.moves == nil {
					return nil, errNullInMatch
				}
				memberID := fmt.Sprintf("%s-%d", teamID, j)
				m.Members = append(m.Members, leaderboard.Member{ID: memberID, TeamID: teamID, PlayerID: *member.playerID})
				for _, mv := range member.moves {
					if mv == nil || mv.moveID == nil || mv.count < 0 {
						return nil, errNullInMatch
					}
					m.Moves = append(m.Moves, leaderboard.Move{TeamMemberID: memberID, MoveID: *mv.moveID, Value: mv.count})
				}
			}
		}
		out[i] = m
	}
	return out, nil
}

// leaderboardQuery reads and checks the scope and season of a leaderboard
// request.
func (s *Server) leaderboardQuery(r *request) (groupDTO, string, string, response) {
	query := r.URL.Query()
	scopes, hasScope := query["scope"]
	if !hasScope {
		return groupDTO{}, "", "", springError(400)
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
		return groupDTO{}, "", "", fail(errGroupNotFound)
	}
	if err != nil {
		return groupDTO{}, "", "", internal(err)
	}
	switch {
	case scope != "season" && scope != "today" && scope != "all-time":
		return groupDTO{}, "", "", fail(errLeaderboardScopeNotFound)
	case scope == "season" && seasonID == nil:
		return groupDTO{}, "", "", fail(errLeaderboardSeasonNotFound)
	case scope == "season":
		exists, err := s.q.SeasonExists(ctx, *seasonID)
		if err != nil {
			return groupDTO{}, "", "", internal(err)
		}
		if !exists {
			return groupDTO{}, "", "", fail(errSeasonNotFound)
		}
		if res := s.seasonOfGroup(r, *seasonID); res != nil {
			return groupDTO{}, "", "", res
		}
	}
	return toGroupDTO(group), scope, deref(seasonID), nil
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
// playerIDs, when not nil, limits the board to those players. projected live
// matches count after the stored ones.
func (s *Server) leaderboardFor(ctx context.Context, q *db.Queries, group groupDTO, scope string, keepStored bool, seasonID string, playerIDs []string, projected ...leaderboard.Match) (board, response) {
	li, res := s.leaderboardInput(ctx, q, group, scope, keepStored, seasonID, playerIDs, projected...)
	if res != nil {
		return board{}, res
	}
	result, err := leaderboard.Compute(li.in)
	if err != nil {
		return board{}, internal(err)
	}
	b := board{numMatches: result.NumMatches, startedAt: li.startedAt, seasons: li.seasons}
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

// leaderboardInput is what a board is computed from.
type leaderboardInput struct {
	in        leaderboard.Input
	startedAt *time.Time
	seasons   map[string]seasonDTO // season of every player
	matches   []fullMatch
	ruleMoves map[string]db.RuleMove
}

// leaderboardInput loads the matches and players of the scope; see
// leaderboardFor.
func (s *Server) leaderboardInput(ctx context.Context, q *db.Queries, group groupDTO, scope string, keepStored bool, seasonID string, playerIDs []string, projected ...leaderboard.Match) (leaderboardInput, response) {
	var (
		matches   []db.Match
		players   []playerRow
		startedAt *time.Time
		err       error
	)
	switch scope {
	case "all-time":
		if group.ActiveSeasonID == nil {
			return leaderboardInput{}, fail(errGeneric)
		}
		if matches, err = q.MatchesBySeason(ctx, group.ActiveSeasonID); err != nil {
			return leaderboardInput{}, internal(err)
		}
		rows, err := q.PlayersWithStatsInGroup(ctx, &group.ID)
		if err != nil {
			return leaderboardInput{}, internal(err)
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
				return leaderboardInput{}, fail(errGroupNoRunningSeason)
			}
			seasonID = *group.ActiveSeasonID
		}
		sn, found, err := s.loadSeason(ctx, q, seasonID)
		if err != nil {
			return leaderboardInput{}, internal(err)
		}
		if !found {
			if scope == "today" {
				return leaderboardInput{}, fail(errGroupNoRunningSeason)
			}
			return leaderboardInput{}, fail(errSeasonNotFound)
		}
		if scope == "today" {
			since, err := dayStart(s.now(), sn.Settings)
			if err != nil {
				return leaderboardInput{}, internal(err)
			}
			matches, err = q.MatchesBySeasonSince(ctx, db.MatchesBySeasonSinceParams{SeasonID: &sn.ID, Date: &since})
		} else {
			matches, err = q.MatchesBySeason(ctx, &sn.ID)
		}
		if err != nil {
			return leaderboardInput{}, internal(err)
		}
		rows, err := q.PlayersWithStatsInSeason(ctx, db.PlayersWithStatsInSeasonParams{SeasonID: &sn.ID, PlayerIds: playerIDs})
		if err != nil {
			return leaderboardInput{}, internal(err)
		}
		for _, row := range rows {
			players = append(players, playerRow(row))
		}
		startedAt = sn.StartDate
	default:
		return leaderboardInput{}, fail(errLeaderboardScopeNotFound)
	}

	full, err := s.loadFullMatches(ctx, q, matches)
	if err != nil {
		return leaderboardInput{}, internal(err)
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
	ruleMoves := map[string]db.RuleMove{}
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
	for _, m := range projected {
		in.Matches = append(in.Matches, m)
		for _, tm := range m.Members {
			memberPlayers = append(memberPlayers, tm.PlayerID)
		}
		for _, mv := range m.Moves {
			moveIDs = append(moveIDs, mv.MoveID)
		}
	}
	if len(moveIDs) > 0 {
		moves, err := q.RuleMovesByIDs(ctx, moveIDs)
		if err != nil {
			return leaderboardInput{}, internal(err)
		}
		for _, m := range moves {
			ruleMoves[m.ID] = m
			in.RuleMoves[m.ID] = leaderboard.RuleMove{PointsForScorer: m.PointsForScorer, PointsForTeam: m.PointsForTeam, Finishing: m.FinishingMove, Cups: cupsPerHit(m)}
		}
	}
	if len(memberPlayers) > 0 {
		rows, err := q.ProfileIDsOfPlayers(ctx, memberPlayers)
		if err != nil {
			return leaderboardInput{}, internal(err)
		}
		for _, row := range rows {
			if row.ProfileID == nil {
				return leaderboardInput{}, internalf("player %s has no profile", row.ID)
			}
			in.ProfileOf[row.ID] = *row.ProfileID
		}
	}

	return leaderboardInput{in: in, startedAt: startedAt, seasons: seasons, matches: full, ruleMoves: ruleMoves}, nil
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
