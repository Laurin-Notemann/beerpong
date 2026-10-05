package api

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// fullMatch is a match with its teams, members and moves, each in database
// order. The first team is blue, the second red.
type fullMatch struct {
	match   db.Match
	teams   []db.Team
	members []db.TeamMember
	moves   []db.MatchMove
}

// loadFullMatches loads teams, members and moves for all matches with one
// query per level.
func (s *Server) loadFullMatches(ctx context.Context, q *db.Queries, matches []db.Match) ([]fullMatch, error) {
	out := make([]fullMatch, len(matches))
	if len(matches) == 0 {
		return out, nil
	}
	ids := make([]string, len(matches))
	byMatch := map[string]*fullMatch{}
	for i, m := range matches {
		ids[i] = m.ID
		out[i].match = m
		byMatch[m.ID] = &out[i]
	}
	teams, err := q.TeamsByMatchIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	teamMatch := map[string]*fullMatch{}
	teamIDs := make([]string, 0, len(teams))
	for _, t := range teams {
		fm := byMatch[deref(t.MatchID)]
		fm.teams = append(fm.teams, t)
		teamMatch[t.ID] = fm
		teamIDs = append(teamIDs, t.ID)
	}
	if len(teamIDs) == 0 {
		return out, nil
	}
	members, err := q.TeamMembersByTeamIDs(ctx, teamIDs)
	if err != nil {
		return nil, err
	}
	memberMatch := map[string]*fullMatch{}
	memberIDs := make([]string, 0, len(members))
	for _, tm := range members {
		fm := teamMatch[deref(tm.TeamID)]
		fm.members = append(fm.members, tm)
		memberMatch[tm.ID] = fm
		memberIDs = append(memberIDs, tm.ID)
	}
	if len(memberIDs) == 0 {
		return out, nil
	}
	moves, err := q.MatchMovesByTeamMemberIDs(ctx, memberIDs)
	if err != nil {
		return nil, err
	}
	for _, mv := range moves {
		fm := memberMatch[deref(mv.TeamMemberID)]
		fm.moves = append(fm.moves, mv)
	}
	return out, nil
}

func (m fullMatch) input() leaderboard.Match {
	in := leaderboard.Match{ID: m.match.ID}
	if m.match.Date != nil {
		in.Date = *m.match.Date
	}
	for _, t := range m.teams {
		in.TeamIDs = append(in.TeamIDs, t.ID)
	}
	for _, tm := range m.members {
		in.Members = append(in.Members, leaderboard.Member{ID: tm.ID, TeamID: deref(tm.TeamID), PlayerID: deref(tm.PlayerID)})
	}
	for _, mv := range m.moves {
		in.Moves = append(in.Moves, leaderboard.Move{TeamMemberID: deref(mv.TeamMemberID), MoveID: deref(mv.MoveID), Value: mv.Value})
	}
	return in
}

func (m fullMatch) extended() matchExtendedDTO {
	dto := matchExtendedDTO{
		matchDTO:    toMatchDTO(m.match),
		Teams:       make([]teamDTO, len(m.teams)),
		TeamMembers: make([]teamMemberDTO, len(m.members)),
		MatchMoves:  make([]matchMoveCompleteDTO, len(m.moves)),
	}
	for i, t := range m.teams {
		dto.Teams[i] = toTeamDTO(t)
	}
	for i, tm := range m.members {
		dto.TeamMembers[i] = teamMemberDTO{ID: tm.ID, TeamID: tm.TeamID, PlayerID: tm.PlayerID}
	}
	for i, mv := range m.moves {
		dto.MatchMoves[i] = matchMoveCompleteDTO{ID: mv.ID, Value: mv.Value, TeamMemberID: mv.TeamMemberID, MoveID: mv.MoveID}
	}
	return dto
}

var errNotTwoTeams = errors.New("match must have exactly 2 teams")

func (m fullMatch) overview(ruleMoves map[string]db.RuleMove) (matchOverviewDTO, error) {
	if len(m.teams) != 2 {
		return matchOverviewDTO{}, errNotTwoTeams
	}
	team := func(t db.Team) overviewTeamDTO {
		var members []db.TeamMember
		inTeam := map[string]bool{}
		for _, tm := range m.members {
			if deref(tm.TeamID) == t.ID {
				members = append(members, tm)
				inTeam[tm.ID] = true
			}
		}
		var teamMoves []db.MatchMove
		for _, mv := range m.moves {
			if inTeam[deref(mv.TeamMemberID)] {
				teamMoves = append(teamMoves, mv)
			}
		}
		out := overviewTeamDTO{
			TeamID:       t.ID,
			AssetPhotoID: t.AssetIDPhoto,
			Points:       countPoints(teamMoves, int32(len(members)), ruleMoves),
			Members:      make([]overviewMemberDTO, len(members)),
		}
		for i, tm := range members {
			var own []db.MatchMove
			moves := []matchMoveDTO{}
			for _, mv := range teamMoves {
				if deref(mv.TeamMemberID) == tm.ID {
					own = append(own, mv)
					moves = append(moves, matchMoveDTO{MoveID: mv.MoveID, Count: mv.Value})
				}
			}
			out.Members[i] = overviewMemberDTO{PlayerID: tm.PlayerID, Points: countPoints(own, 1, ruleMoves), Moves: moves}
		}
		return out
	}
	return matchOverviewDTO{
		ID:       m.match.ID,
		Date:     utc(m.match.Date),
		SeasonID: m.match.SeasonID,
		BlueTeam: team(m.teams[0]),
		RedTeam:  team(m.teams[1]),
	}, nil
}

// countPoints: each move scores its scorer points plus team points once per
// counted member (multiplier).
func countPoints(moves []db.MatchMove, multiplier int32, ruleMoves map[string]db.RuleMove) int32 {
	var total int32
	for _, mv := range moves {
		rm, ok := ruleMoves[deref(mv.MoveID)]
		if !ok {
			continue
		}
		total += mv.Value * (rm.PointsForScorer + multiplier*rm.PointsForTeam)
	}
	return total
}

func (s *Server) ruleMovesOf(ctx context.Context, matches []fullMatch) (map[string]db.RuleMove, error) {
	var ids []string
	for _, m := range matches {
		for _, mv := range m.moves {
			ids = append(ids, deref(mv.MoveID))
		}
	}
	out := map[string]db.RuleMove{}
	if len(ids) == 0 {
		return out, nil
	}
	moves, err := s.q.RuleMovesByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, m := range moves {
		out[m.ID] = m
	}
	return out, nil
}

func (s *Server) seasonMatches(r *request) ([]fullMatch, response) {
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return nil, res
	}
	matches, err := s.q.MatchesBySeason(r.Context(), &seasonID)
	if err != nil {
		return nil, internal(err)
	}
	full, err := s.loadFullMatches(r.Context(), s.q, matches)
	if err != nil {
		return nil, internal(err)
	}
	return full, nil
}

func (s *Server) listMatches(r *request) response {
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	matches, err := s.q.MatchesBySeason(r.Context(), &seasonID)
	if err != nil {
		return internal(err)
	}
	out := make([]matchDTO, len(matches))
	for i, m := range matches {
		out[i] = toMatchDTO(m)
	}
	return ok(out)
}

func (s *Server) listMatchesExtended(r *request) response {
	full, res := s.seasonMatches(r)
	if res != nil {
		return res
	}
	out := make([]matchExtendedDTO, len(full))
	for i, m := range full {
		out[i] = m.extended()
	}
	return ok(out)
}

func (s *Server) listMatchOverviews(r *request) response {
	full, res := s.seasonMatches(r)
	if res != nil {
		return res
	}
	ruleMoves, err := s.ruleMovesOf(r.Context(), full)
	if err != nil {
		return internal(err)
	}
	out := make([]matchOverviewDTO, len(full))
	for i, m := range full {
		if out[i], err = m.overview(ruleMoves); err != nil {
			return internal(err)
		}
	}
	return ok(out)
}

// matchInSeason loads one match for the GET endpoints.
func (s *Server) matchInSeason(r *request) (*fullMatch, response) {
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return nil, res
	}
	match, err := s.q.GetMatch(r.Context(), r.path("id"))
	if notFound(err) {
		return nil, fail(errMatchNotFound)
	}
	if err != nil {
		return nil, internal(err)
	}
	if deref(match.SeasonID) != seasonID {
		return nil, fail(errMatchSeasonMismatch)
	}
	full, err := s.loadFullMatches(r.Context(), s.q, []db.Match{match})
	if err != nil {
		return nil, internal(err)
	}
	return &full[0], nil
}

func (s *Server) getMatch(r *request) response {
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	match, err := s.q.GetMatch(r.Context(), r.path("id"))
	if notFound(err) {
		return fail(errMatchNotFound)
	}
	if err != nil {
		return internal(err)
	}
	if deref(match.SeasonID) != seasonID {
		return fail(errMatchSeasonMismatch)
	}
	return ok(toMatchDTO(match))
}

func (s *Server) getMatchExtended(r *request) response {
	m, res := s.matchInSeason(r)
	if res != nil {
		return res
	}
	return ok(m.extended())
}

func (s *Server) getMatchOverview(r *request) response {
	m, res := s.matchInSeason(r)
	if res != nil {
		return res
	}
	ruleMoves, err := s.ruleMovesOf(r.Context(), []fullMatch{*m})
	if err != nil {
		return internal(err)
	}
	overview, err := m.overview(ruleMoves)
	if err != nil {
		return internal(err)
	}
	return ok(overview)
}

// matchInput is a MatchCreateDto. Nil pointers mark JSON nulls, which the
// Java backend failed on with a server error at the point it touched them.
type matchInput struct {
	// id is the app's id for a new match, so that sending the same match again
	// returns it instead of creating a copy; optional.
	id    *string
	teams []*teamInput
}

type teamInput struct {
	existingTeamID *string
	savePhoto      bool
	members        []*memberInput // nil when the list was null
}

type memberInput struct {
	playerID *string
	moves    []*moveInput // nil when the list was null
}

type moveInput struct {
	moveID *string
	count  int32
}

func parseMatchInput(body any) (matchInput, error) {
	o, err := asObject(body)
	if err != nil {
		return matchInput{}, err
	}
	var in matchInput
	if in.id, err = o.str("id"); err != nil {
		return in, err
	}
	teams, present, err := o.list("teams")
	if err != nil {
		return in, err
	}
	if !present {
		return in, nil
	}
	in.teams = make([]*teamInput, len(teams))
	for i, raw := range teams {
		if raw == nil {
			continue
		}
		to, err := asObject(raw)
		if err != nil {
			return in, err
		}
		t := &teamInput{}
		if t.existingTeamID, err = to.str("existingTeamId"); err != nil {
			return in, err
		}
		if t.savePhoto, err = to.primitiveBool("savePhoto"); err != nil {
			return in, err
		}
		members, present, err := to.list("teamMembers")
		if err != nil {
			return in, err
		}
		if present {
			t.members = make([]*memberInput, len(members))
			for j, rawMember := range members {
				if rawMember == nil {
					continue
				}
				mo, err := asObject(rawMember)
				if err != nil {
					return in, err
				}
				m := &memberInput{}
				if m.playerID, err = mo.str("playerId"); err != nil {
					return in, err
				}
				moves, present, err := mo.list("moves")
				if err != nil {
					return in, err
				}
				if present {
					m.moves = make([]*moveInput, len(moves))
					for k, rawMove := range moves {
						if rawMove == nil {
							continue
						}
						mvo, err := asObject(rawMove)
						if err != nil {
							return in, err
						}
						mv := &moveInput{}
						if mv.moveID, err = mvo.str("moveId"); err != nil {
							return in, err
						}
						if mv.count, err = mvo.primitiveInt("count"); err != nil {
							return in, err
						}
						m.moves[k] = mv
					}
				}
				t.members[j] = m
			}
		}
		in.teams[i] = t
	}
	return in, nil
}

var errNullInMatch = errors.New("match body contains null where a value is required")

// wrongTeamSizes checks every team against the season's size limits. It is
// also where nulls in teams or member lists surfaced in Java.
func wrongTeamSizes(in matchInput, st *settings) (bool, error) {
	if in.teams == nil {
		return false, errNullInMatch
	}
	limits := defaultSettings("")
	if st != nil {
		limits = *st
	}
	for _, t := range in.teams {
		if t == nil || t.members == nil {
			return false, errNullInMatch
		}
		if n := int32(len(t.members)); n < limits.MinTeamSize || n > limits.MaxTeamSize {
			return true, nil
		}
	}
	return false, nil
}

// invalidMatch is the content validation: distinct players of the season,
// rule moves of the season, exactly one finishing move counted once.
func invalidMatch(ctx context.Context, q *db.Queries, seasonID string, in matchInput) (bool, error) {
	var playerIDs []string
	var moves []*moveInput
	for _, t := range in.teams {
		for _, m := range t.members {
			if m == nil || m.moves == nil {
				return false, errNullInMatch
			}
			playerIDs = append(playerIDs, deref(m.playerID))
			for _, mv := range m.moves {
				if mv == nil {
					return false, errNullInMatch
				}
				if mv.count > 0 {
					moves = append(moves, mv)
				}
			}
		}
	}
	seenMove := map[string]bool{}
	var moveIDs []string
	for _, mv := range moves {
		id := deref(mv.moveID)
		if !seenMove[id] {
			seenMove[id] = true
			moveIDs = append(moveIDs, id)
		}
	}
	seenPlayer := map[string]bool{}
	for _, id := range playerIDs {
		if seenPlayer[id] {
			return true, nil
		}
		seenPlayer[id] = true
	}

	finishing, err := q.FinishingMoveIDs(ctx, moveIDs)
	if err != nil {
		return false, err
	}
	var finishes []*moveInput
	for _, mv := range moves {
		if contains(finishing, deref(mv.moveID)) {
			finishes = append(finishes, mv)
		}
	}
	if len(finishes) != 1 || finishes[0].count != 1 {
		return true, nil
	}
	inSeason, err := q.CountRuleMovesInSeason(ctx, db.CountRuleMovesInSeasonParams{Ids: moveIDs, SeasonID: &seasonID})
	if err != nil {
		return false, err
	}
	if inSeason != int64(len(moveIDs)) {
		return true, nil
	}
	players, err := q.ExistingPlayersInSeason(ctx, db.ExistingPlayersInSeasonParams{Ids: playerIDs, SeasonID: &seasonID})
	if err != nil {
		return false, err
	}
	return players != int64(len(playerIDs)), nil
}

// insertValidMatch validates a match against its active season and the
// caller's membership, then inserts it with its teams. POST /matches and
// finishing a live match both end here. A non-nil response is the error to
// answer with; the transaction must roll back.
func (s *Server) insertValidMatch(r *request, q *db.Queries, groupID string, sn season, matchID string, in matchInput) (matchDTO, response, error) {
	ctx := r.Context()
	wrong, err := wrongTeamSizes(in, sn.Settings)
	if err != nil {
		return matchDTO{}, nil, err
	}
	if wrong {
		return matchDTO{}, fail(errMatchDtoValidationFailed), nil
	}
	if len(in.teams) != 2 {
		return matchDTO{}, fail(errMatchWrongAmountOfTeams), nil
	}
	memberID, err := s.membershipID(r, q, groupID)
	if err != nil {
		return matchDTO{}, nil, err
	}
	if memberID == "" {
		return matchDTO{}, fail(errAuthUserNotInGroup), nil
	}
	invalid, err := invalidMatch(ctx, q, sn.ID, in)
	if err != nil {
		return matchDTO{}, nil, err
	}
	if invalid {
		return matchDTO{}, fail(errMatchDtoValidationFailed), nil
	}

	// as stored, so a repeated create answers with the same date
	now := s.now().Truncate(time.Microsecond)
	if err := q.InsertMatch(ctx, db.InsertMatchParams{ID: matchID, Date: &now, SeasonID: &sn.ID, CreatedBy: &memberID}); err != nil {
		return matchDTO{}, nil, err
	}
	photos, err := s.createTeams(r, q, matchID, in, nil)
	if err != nil {
		return matchDTO{}, nil, err
	}
	return matchDTO{ID: matchID, Date: &now, SeasonID: &sn.ID, CreatedByID: &memberID, PhotoUploads: &photos}, nil, nil
}

func (s *Server) createMatch(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	in, err := parseMatchInput(body)
	if err != nil {
		return springError(400)
	}
	groupID, seasonID := r.path("groupId"), r.path("seasonId")
	matchID := uuid.NewString()
	if in.id != nil {
		if !isUUID(*in.id) {
			return fail(errMatchDtoValidationFailed)
		}
		matchID = *in.id
	}
	ctx := r.Context()
	var created matchDTO
	var isNew bool
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		_, sn, res := s.activeSeason(ctx, q, groupID, seasonID)
		if res != nil {
			return res, nil
		}
		// a retry of a create that went through (its response got lost) returns the match
		if existing, err := q.GetMatch(ctx, matchID); err == nil {
			if deref(existing.SeasonID) != sn.ID {
				return fail(errMatchDtoValidationFailed), nil
			}
			created = toMatchDTO(existing)
			created.PhotoUploads = &[]teamPhotoDTO{}
			return ok(created), nil
		} else if !notFound(err) {
			return nil, err
		}
		match, failure, err := s.insertValidMatch(r, q, groupID, sn, matchID, in)
		if err != nil || failure != nil {
			return failure, err
		}
		created, isNew = match, true
		return ok(created), nil
	})
	if _, isOK := res.(okResponse); isOK && isNew {
		s.hub.Publish(groupID, realtime.Matches, "matchCreate", created)
	}
	return res
}

// createTeams inserts teams, members and moves. For updates, oldPhotos maps
// the previous team ids to their photo asset, which carries over unless the
// team asks for a new photo.
func (s *Server) createTeams(r *request, q *db.Queries, matchID string, in matchInput, oldPhotos map[string]string) ([]teamPhotoDTO, error) {
	ctx := r.Context()
	photos := []teamPhotoDTO{}
	teams := make([]db.InsertTeamsParams, len(in.teams))
	for i, t := range in.teams {
		teams[i] = db.InsertTeamsParams{ID: uuid.NewString(), MatchID: &matchID}
		var photo *string
		switch {
		case t.existingTeamID == nil:
			if t.savePhoto {
				upload, err := s.newTeamPhoto(r, q)
				if err != nil {
					return nil, err
				}
				photo = &upload.ID
				photos = append(photos, teamPhotoDTO{TeamPhoto: upload})
			}
		case oldPhotos == nil:
		case t.savePhoto:
			if old, has := oldPhotos[*t.existingTeamID]; has {
				if err := s.deleteAsset(ctx, q, old); err != nil {
					return nil, err
				}
			}
			upload, err := s.newTeamPhoto(r, q)
			if err != nil {
				return nil, err
			}
			photo = &upload.ID
			photos = append(photos, teamPhotoDTO{TeamID: t.existingTeamID, TeamPhoto: upload})
		default:
			if old, has := oldPhotos[*t.existingTeamID]; has {
				photo = &old
			}
		}
		teams[i].AssetIDPhoto = photo
	}
	if _, err := q.InsertTeams(ctx, teams); err != nil {
		return nil, err
	}

	// Members whose player does not exist are skipped, as before.
	var playerIDs []string
	for _, t := range in.teams {
		for _, m := range t.members {
			playerIDs = append(playerIDs, deref(m.playerID))
		}
	}
	existing := map[string]bool{}
	if len(playerIDs) > 0 {
		ids, err := q.ExistingPlayerIDs(ctx, playerIDs)
		if err != nil {
			return nil, err
		}
		for _, id := range ids {
			existing[id] = true
		}
	}
	var members []db.InsertTeamMembersParams
	var moves []db.InsertMatchMovesParams
	for i, t := range in.teams {
		for _, m := range t.members {
			if !existing[deref(m.playerID)] {
				continue
			}
			memberID := uuid.NewString()
			members = append(members, db.InsertTeamMembersParams{ID: memberID, TeamID: &teams[i].ID, PlayerID: m.playerID})
			for _, mv := range m.moves {
				if mv.count >= 1 {
					moves = append(moves, db.InsertMatchMovesParams{ID: uuid.NewString(), Value: mv.count, TeamMemberID: &memberID, MoveID: mv.moveID})
				}
			}
		}
	}
	if len(members) > 0 {
		if _, err := q.InsertTeamMembers(ctx, members); err != nil {
			return nil, err
		}
	}
	if len(moves) > 0 {
		if _, err := q.InsertMatchMoves(ctx, moves); err != nil {
			return nil, err
		}
	}
	return photos, nil
}

func (s *Server) newTeamPhoto(r *request, q *db.Queries) (assetUploadDTO, error) {
	asset, err := insertAsset(r.Context(), q, assetTeamPhoto, crop{})
	if err != nil {
		return assetUploadDTO{}, err
	}
	return s.assetUpload(r, asset)
}

func (s *Server) updateMatch(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	in, err := parseMatchInput(body)
	if err != nil {
		return springError(400)
	}
	groupID, seasonID, matchID := r.path("groupId"), r.path("seasonId"), r.path("id")
	ctx := r.Context()
	var updated matchDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		_, sn, res := s.activeSeason(ctx, q, groupID, seasonID)
		if res != nil {
			return res, nil
		}
		wrong, err := wrongTeamSizes(in, sn.Settings)
		if err != nil {
			return nil, err
		}
		if wrong {
			return fail(errMatchDtoValidationFailed), nil
		}
		if len(in.teams) != 2 {
			return fail(errMatchWrongAmountOfTeams), nil
		}
		teamIDs := make([]string, 0, len(in.teams))
		for _, t := range in.teams {
			if t.existingTeamID == nil {
				return fail(errMatchNeedsTeamIDs), nil
			}
			if contains(teamIDs, *t.existingTeamID) {
				return fail(errMatchTeamNotUnique), nil
			}
			teamIDs = append(teamIDs, *t.existingTeamID)
		}
		found, err := q.CountTeams(ctx, teamIDs)
		if err != nil {
			return nil, err
		}
		if found != int64(len(teamIDs)) {
			return fail(errMatchTeamNotFound), nil
		}
		exists, err := q.MatchExistsInSeason(ctx, db.MatchExistsInSeasonParams{ID: matchID, SeasonID: &seasonID})
		if err != nil {
			return nil, err
		}
		if !exists {
			return fail(errSeasonNotOfGroup), nil
		}
		invalid, err := invalidMatch(ctx, q, sn.ID, in)
		if err != nil {
			return nil, err
		}
		if invalid {
			return fail(errMatchDtoValidationFailed), nil
		}

		match, err := q.GetMatch(ctx, matchID)
		if err != nil {
			return nil, err
		}
		oldTeams, err := q.TeamsByMatchIDs(ctx, []string{matchID})
		if err != nil {
			return nil, err
		}
		oldPhotos := map[string]string{}
		for _, t := range oldTeams {
			if t.AssetIDPhoto != nil {
				oldPhotos[t.ID] = *t.AssetIDPhoto
			}
		}
		if err := deleteMatchContent(ctx, q, matchID); err != nil {
			return nil, err
		}
		photos, err := s.createTeams(r, q, matchID, in, oldPhotos)
		if err != nil {
			return nil, err
		}
		updated = toMatchDTO(match)
		updated.PhotoUploads = &photos
		return ok(updated), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.Matches, "matchUpdate", updated)
	}
	return res
}

// deleteMatchContent removes moves, members and teams of a match.
func deleteMatchContent(ctx context.Context, q *db.Queries, matchID string) error {
	if err := q.DeleteMatchMovesOfMatch(ctx, &matchID); err != nil {
		return err
	}
	if err := q.DeleteTeamMembersOfMatch(ctx, &matchID); err != nil {
		return err
	}
	return q.DeleteTeamsOfMatch(ctx, &matchID)
}

func (s *Server) deleteMatch(r *request) response {
	groupID, seasonID, matchID := r.path("groupId"), r.path("seasonId"), r.path("id")
	ctx := r.Context()
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		match, err := q.GetMatch(ctx, matchID)
		if notFound(err) {
			return fail(errMatchNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		sn, found, err := s.loadSeason(ctx, q, seasonID)
		if err != nil {
			return nil, err
		}
		if !found {
			return fail(errSeasonNotFound), nil
		}
		if sn.GroupID == nil {
			return nil, errors.New("season without group")
		}
		if *sn.GroupID != groupID {
			return fail(errSeasonNotOfGroup), nil
		}
		if sn.EndDate != nil {
			return fail(errSeasonAlreadyEnded), nil
		}
		if deref(match.SeasonID) != seasonID {
			return fail(errMatchSeasonMismatch), nil
		}
		photos, err := q.PhotoAssetIDsOfMatch(ctx, &matchID)
		if err != nil {
			return nil, err
		}
		if err := deleteMatchContent(ctx, q, matchID); err != nil {
			return nil, err
		}
		if err := q.DeleteMatch(ctx, matchID); err != nil {
			return nil, err
		}
		for _, id := range photos {
			if err := s.deleteAsset(ctx, q, id); err != nil {
				return nil, err
			}
		}
		return ok("OK"), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.Matches, "matchDelete", matchID)
	}
	return res
}

// teamOfMatch checks the photo endpoints' path: the match is in the season
// and the team belongs to the match.
func (s *Server) teamOfMatch(r *request) response {
	matchID := r.path("id")
	exists, err := s.q.MatchExistsInSeason(r.Context(), db.MatchExistsInSeasonParams{ID: matchID, SeasonID: ptr(r.path("seasonId"))})
	if err != nil {
		return internal(err)
	}
	if !exists {
		return fail(errMatchNotFound)
	}
	// the season (and so the match) has to belong to the group the caller is a member of
	sn, found, err := s.loadSeason(r.Context(), s.q, r.path("seasonId"))
	if err != nil {
		return internal(err)
	}
	if !found || deref(sn.GroupID) != r.path("groupId") {
		return fail(errSeasonNotOfGroup)
	}
	inMatch, err := s.q.TeamExistsInMatch(r.Context(), db.TeamExistsInMatchParams{ID: r.path("teamId"), MatchID: &matchID})
	if err != nil {
		return internal(err)
	}
	if !inMatch {
		return fail(errMatchNoTeamFound)
	}
	return nil
}

// Team photo events are addressed to the match id, as the Java backend did.

func (s *Server) setTeamPhoto(r *request) response {
	if res := s.teamOfMatch(r); res != nil {
		return res
	}
	teamID := r.path("teamId")
	ctx := r.Context()
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		team, err := q.GetTeam(ctx, teamID)
		if err != nil {
			return nil, err
		}
		upload, err := s.newTeamPhoto(r, q)
		if err != nil {
			return nil, err
		}
		if _, err := q.SetTeamPhoto(ctx, db.SetTeamPhotoParams{ID: teamID, AssetIDPhoto: &upload.ID}); err != nil {
			return nil, err
		}
		if team.AssetIDPhoto != nil {
			if err := s.deleteAsset(ctx, q, *team.AssetIDPhoto); err != nil {
				return nil, err
			}
		}
		return ok(upload), nil
	})
	if o, isOK := res.(okResponse); isOK {
		s.hub.Publish(r.path("groupId"), realtime.Assets, "matchTeamPhotoSet", o.data)
	}
	return res
}

func (s *Server) deleteTeamPhoto(r *request) response {
	if res := s.teamOfMatch(r); res != nil {
		return res
	}
	teamID := r.path("teamId")
	ctx := r.Context()
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		team, err := q.GetTeam(ctx, teamID)
		if err != nil {
			return nil, err
		}
		if team.AssetIDPhoto == nil {
			return fail(errMatchTeamHasNoPhoto), nil
		}
		updated, err := q.SetTeamPhoto(ctx, db.SetTeamPhotoParams{ID: teamID})
		if err != nil {
			return nil, err
		}
		if err := s.deleteAsset(ctx, q, *team.AssetIDPhoto); err != nil {
			return nil, err
		}
		return ok(toTeamDTO(updated)), nil
	})
	if o, isOK := res.(okResponse); isOK {
		s.hub.Publish(r.path("groupId"), realtime.Assets, "matchTeamPhotoDelete", o.data)
	}
	return res
}
