package api

import (
	"context"
	"errors"
	"fmt"
	"maps"
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
		if out[i], err = parseProjectedMatch(raw, fmt.Sprintf("projected-%d", i), now); err != nil {
			return nil, err
		}
	}
	return out, nil
}

// parseProjectedMatch reads one live match as it would be entered now
// ({"teams": [blue, red]} in the match create format) and counts it as
// ending now.
func parseProjectedMatch(raw any, id string, now time.Time) (leaderboard.Match, error) {
	in, err := parseMatchInput(raw)
	if err != nil || len(in.teams) != 2 {
		return leaderboard.Match{}, errors.New("a projected match needs two teams")
	}
	m := leaderboard.Match{ID: id, Date: now, Projected: true}
	for t, team := range in.teams {
		if team == nil || team.members == nil {
			return m, errNullInMatch
		}
		teamID := fmt.Sprintf("%s-team-%d", id, t)
		m.TeamIDs = append(m.TeamIDs, teamID)
		for j, member := range team.members {
			if member == nil || member.playerID == nil || member.moves == nil {
				return m, errNullInMatch
			}
			memberID := fmt.Sprintf("%s-%d", teamID, j)
			m.Members = append(m.Members, leaderboard.Member{ID: memberID, TeamID: teamID, PlayerID: *member.playerID})
			for _, mv := range member.moves {
				if mv == nil || mv.moveID == nil || mv.count < 0 {
					return m, errNullInMatch
				}
				m.Moves = append(m.Moves, leaderboard.Move{TeamMemberID: memberID, MoveID: *mv.moveID, Value: mv.count})
			}
		}
	}
	return m, nil
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
	active     []*leaderboard.Entry // entries shown
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
	if scope == "all-time" {
		return s.allTimeBoard(ctx, q, group, projected...)
	}
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
		if e.Player.Active {
			b.active = append(b.active, e)
		}
	}
	return b, nil
}

// allTimeBoard replays every match of the group, oldest first, so every
// all-time number comes from the matches and a player's rating carries
// across seasons; a season board starts everyone at StartingElo. Projected
// matches belong to the running season. A profile is on it when it played or
// is on a season board: removing a player keeps the profile, and a removed
// profile that never played (a duplicate) stays off, as in the simulator.
func (s *Server) allTimeBoard(ctx context.Context, q *db.Queries, group groupDTO, projected ...leaderboard.Match) (board, response) {
	if group.ActiveSeasonID == nil {
		return board{}, fail(errGeneric)
	}
	seasons, err := q.SeasonsByGroup(ctx, &group.ID)
	if err != nil {
		return board{}, internal(err)
	}
	inputs, err := s.groupInputs(ctx, q, group, seasons, projected)
	if err != nil {
		return board{}, internal(err)
	}
	all := leaderboard.Input{RuleMoves: map[string]leaderboard.RuleMove{}, ProfileOf: map[string]string{}}
	b := board{startedAt: group.CreatedAt, seasons: map[string]seasonDTO{}}
	onSeasonBoard := map[string]bool{} // by profile
	for _, li := range inputs {
		all.Players = append(all.Players, li.in.Players...)
		all.Matches = append(all.Matches, li.in.Matches...)
		maps.Copy(all.RuleMoves, li.in.RuleMoves)
		maps.Copy(all.ProfileOf, li.in.ProfileOf)
		maps.Copy(b.seasons, li.seasons)
		for _, p := range li.in.Players {
			if p.Active {
				onSeasonBoard[deref(p.ProfileID)] = true
			}
		}
	}
	result, err := leaderboard.Compute(all)
	if err != nil {
		return board{}, internal(err)
	}
	b.numMatches = result.NumMatches
	for _, e := range result.Entries {
		if e.Stats.Matches > 0 || onSeasonBoard[deref(e.Player.ProfileID)] {
			b.active = append(b.active, e)
		}
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

	inputs, err := s.leaderboardInputs(ctx, q, keepStored, []seasonRows{{players: players, matches: matches, projected: projected, startedAt: startedAt}})
	if err != nil {
		return leaderboardInput{}, internal(err)
	}
	return inputs[0], nil
}

// groupInputs is leaderboardInput("season") for each of seasons, all
// seasons of the group, loaded together: a board over every season (all
// time, the Elo simulation) costs as many queries as one season's. projected
// matches count in the running season.
func (s *Server) groupInputs(ctx context.Context, q *db.Queries, group groupDTO, seasons []db.SeasonsByGroupRow, projected []leaderboard.Match) ([]leaderboardInput, error) {
	matches, err := q.MatchesByGroup(ctx, &group.ID)
	if err != nil {
		return nil, err
	}
	players, err := q.PlayersWithStatsInGroup(ctx, &group.ID)
	if err != nil {
		return nil, err
	}
	parts := make([]seasonRows, len(seasons))
	bySeason := map[string]*seasonRows{}
	for i, sn := range seasons {
		parts[i].startedAt = sn.StartDate
		if group.ActiveSeasonID != nil && sn.ID == *group.ActiveSeasonID {
			parts[i].projected = projected
		}
		bySeason[sn.ID] = &parts[i]
	}
	for _, m := range matches {
		if p := bySeason[deref(m.SeasonID)]; p != nil {
			p.matches = append(p.matches, m)
		}
	}
	for _, row := range players {
		if p := bySeason[row.SeasonID]; p != nil {
			p.players = append(p.players, playerRow(row))
		}
	}
	return s.leaderboardInputs(ctx, q, false, parts)
}

// seasonRows is one season's players and matches, in database order, and the
// projected matches that count after them.
type seasonRows struct {
	players   []playerRow
	matches   []db.Match
	projected []leaderboard.Match
	startedAt *time.Time
}

// leaderboardInputs turns each season's rows into a board's input. It loads
// the matches' teams, members and moves, their rule moves and the players'
// profiles with one query each for all seasons.
func (s *Server) leaderboardInputs(ctx context.Context, q *db.Queries, keepStored bool, parts []seasonRows) ([]leaderboardInput, error) {
	var matches []db.Match
	for _, p := range parts {
		matches = append(matches, p.matches...)
	}
	full, err := s.loadFullMatches(ctx, q, matches)
	if err != nil {
		return nil, err
	}
	out := make([]leaderboardInput, len(parts))
	var memberPlayers, moveIDs []string
	for i, p := range parts {
		n := len(p.matches)
		li := leaderboardInput{
			in: leaderboard.Input{
				KeepStoredStats: keepStored,
				RuleMoves:       map[string]leaderboard.RuleMove{},
				ProfileOf:       map[string]string{},
			},
			startedAt: p.startedAt,
			seasons:   map[string]seasonDTO{},
			matches:   full[:n:n],
			ruleMoves: map[string]db.RuleMove{},
		}
		full = full[n:]
		for _, pl := range p.players {
			li.in.Players = append(li.in.Players, pl.player())
			if _, seen := li.seasons[pl.SeasonID]; !seen {
				li.seasons[pl.SeasonID] = pl.season()
			}
		}
		for _, m := range li.matches {
			li.in.Matches = append(li.in.Matches, m.input())
		}
		li.in.Matches = append(li.in.Matches, p.projected...)
		for _, m := range li.in.Matches {
			for _, tm := range m.Members {
				memberPlayers = append(memberPlayers, tm.PlayerID)
			}
			for _, mv := range m.Moves {
				moveIDs = append(moveIDs, mv.MoveID)
			}
		}
		out[i] = li
	}

	ruleMoves := map[string]db.RuleMove{}
	if len(moveIDs) > 0 {
		moves, err := q.RuleMovesByIDs(ctx, moveIDs)
		if err != nil {
			return nil, err
		}
		for _, m := range moves {
			ruleMoves[m.ID] = m
		}
	}
	profileOf := map[string]string{}
	if len(memberPlayers) > 0 {
		rows, err := q.ProfileIDsOfPlayers(ctx, memberPlayers)
		if err != nil {
			return nil, err
		}
		for _, row := range rows {
			if row.ProfileID == nil {
				return nil, fmt.Errorf("player %s has no profile", row.ID)
			}
			profileOf[row.ID] = *row.ProfileID
		}
	}
	// each board gets the rule moves and profiles of its own matches
	for _, li := range out {
		for _, m := range li.in.Matches {
			for _, tm := range m.Members {
				if profile, found := profileOf[tm.PlayerID]; found {
					li.in.ProfileOf[tm.PlayerID] = profile
				}
			}
			for _, mv := range m.Moves {
				if rm, found := ruleMoves[mv.MoveID]; found {
					li.ruleMoves[rm.ID] = rm
					li.in.RuleMoves[rm.ID] = leaderboard.RuleMove{PointsForScorer: rm.PointsForScorer, PointsForTeam: rm.PointsForTeam, Finishing: rm.FinishingMove, Cups: cupsPerHit(rm)}
				}
			}
		}
	}
	return out, nil
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

// playerRow is a player with statistics and season.
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
