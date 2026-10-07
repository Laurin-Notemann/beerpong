package api

import (
	"context"
	"encoding/json"
	"slices"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
	"github.com/laurin-notemann/beerpong/api-go/internal/tournament"
)

var (
	errTournamentInvalid  = errorCode{400, "tournamentInvalid", "Choose a name, equally sized teams of distinct season players, and stages ending in one winner."}
	errTournamentNotFound = errorCode{404, "tournamentNotFound", "This tournament does not exist in this group."}
	errTournamentActive   = errorCode{409, "tournamentActive", "This group already has an active tournament. Finish or cancel it first."}
	errTournamentLocked   = errorCode{409, "tournamentLocked", "A later stage has already started. Its earlier results can no longer change."}
	errTournamentFixture  = errorCode{409, "tournamentFixture", "This tournament game is not ready, or its teams do not match the bracket."}
	errTournamentPlaying  = errorCode{409, "tournamentPlaying", "Finish or discard the running tournament games before cancelling the tournament or starting a season."}
)

func tournamentFromRow(row db.Tournament) (tournament.Tournament, error) {
	var t tournament.Tournament
	err := json.Unmarshal(row.Data, &t)
	return t, err
}
func saveTournament(ctx context.Context, q *db.Queries, t tournament.Tournament) error {
	data, err := json.Marshal(t)
	if err != nil {
		return err
	}
	return q.SaveTournament(ctx, db.SaveTournamentParams{ID: t.ID, Data: data, Status: t.Status})
}
func (s *Server) listTournaments(r *request) response {
	rows, err := s.q.TournamentsByGroup(r.Context(), r.path("groupId"))
	if err != nil {
		return internal(err)
	}
	out := make([]tournament.Tournament, len(rows))
	for i, row := range rows {
		if out[i], err = tournamentFromRow(row); err != nil {
			return internal(err)
		}
	}
	return ok(out)
}
func (s *Server) getTournament(r *request) response {
	row, err := s.q.GetTournament(r.Context(), db.GetTournamentParams{ID: r.path("id"), GroupID: r.path("groupId")})
	if notFound(err) {
		return fail(errTournamentNotFound)
	}
	if err != nil {
		return internal(err)
	}
	t, err := tournamentFromRow(row)
	if err != nil {
		return internal(err)
	}
	return ok(t)
}
func (s *Server) createTournament(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return springError(400)
	}
	var in tournament.Create
	if err := json.Unmarshal(raw, &in); err != nil {
		return springError(400)
	}
	id, groupID := r.path("id"), r.path("groupId")
	if !isUUID(id) || !isUUID(in.SeasonID) {
		return fail(errTournamentInvalid)
	}
	res = s.tx(r.Context(), func(q *db.Queries) (response, error) {
		// Serialize tournament creation and season changes for this group.
		if _, err := q.LockTournamentGroup(r.Context(), groupID); err != nil {
			return nil, err
		}
		if row, err := q.GetTournament(r.Context(), db.GetTournamentParams{ID: id, GroupID: groupID}); err == nil {
			t, err := tournamentFromRow(row)
			return ok(t), err
		} else if !notFound(err) {
			return nil, err
		}
		_, sn, failure := s.activeSeason(r.Context(), q, groupID, in.SeasonID)
		if failure != nil {
			return failure, nil
		}
		t, err := tournament.New(id, groupID, in, s.now())
		if err != nil {
			return fail(errTournamentInvalid), nil
		}
		if sn.Settings == nil || int32(t.TeamSize) < sn.Settings.MinTeamSize || int32(t.TeamSize) > sn.Settings.MaxTeamSize {
			return fail(errTournamentInvalid), nil
		}
		players, err := q.PlayersInSeason(r.Context(), db.PlayersInSeasonParams{SeasonID: &in.SeasonID, IncludeInactive: true})
		if err != nil {
			return nil, err
		}
		for _, team := range t.Teams {
			for _, id := range team.PlayerIDs {
				if !slices.ContainsFunc(players, func(p db.Player) bool { return p.ID == id }) {
					return fail(errTournamentInvalid), nil
				}
			}
		}
		data, err := json.Marshal(t)
		if err != nil {
			return nil, err
		}
		n, err := q.InsertTournament(r.Context(), db.InsertTournamentParams{ID: id, GroupID: groupID, SeasonID: in.SeasonID, Status: t.Status, CreatedAt: t.CreatedAt, Data: data})
		if err != nil {
			return nil, err
		}
		if n == 0 {
			row, err := q.GetTournament(r.Context(), db.GetTournamentParams{ID: id, GroupID: groupID})
			if notFound(err) {
				return fail(errTournamentActive), nil
			}
			if err != nil {
				return nil, err
			}
			existing, err := tournamentFromRow(row)
			return ok(existing), err
		}
		return ok(t), nil
	})
	s.publishTournament(r.path("groupId"), res)
	return res
}
func (s *Server) cancelTournament(r *request) response {
	res := s.tx(r.Context(), func(q *db.Queries) (response, error) {
		row, err := q.LockTournament(r.Context(), db.LockTournamentParams{ID: r.path("id"), GroupID: r.path("groupId")})
		if notFound(err) {
			return fail(errTournamentNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		t, err := tournamentFromRow(row)
		if err != nil {
			return nil, err
		}
		if t.Status != "ACTIVE" {
			return ok(t), nil
		}
		for _, stage := range t.Stages {
			for _, f := range stage.Matches {
				if f.Status == "IN_PROGRESS" {
					return fail(errTournamentPlaying), nil
				}
			}
		}
		now := s.now()
		t.Status, t.EndedAt = "CANCELLED", &now
		return ok(t), saveTournament(r.Context(), q, t)
	})
	s.publishTournament(r.path("groupId"), res)
	return res
}
func (s *Server) publishTournament(groupID string, res response) {
	if o, good := res.(okResponse); good {
		s.hub.Publish(groupID, realtime.Tournaments, "tournamentUpdate", o.data)
	}
}

// The live-match row is always locked before the tournament on finish/abandon.
// Starting only locks the tournament before inserting a new live row; retries
// find an existing row first and never lock these two rows in reverse order.
func lockFixture(ctx context.Context, q *db.Queries, groupID, id string) (*tournament.Tournament, *tournament.Stage, *tournament.Fixture, error) {
	row, err := q.TournamentForFixture(ctx, id)
	if notFound(err) {
		return nil, nil, nil, nil
	}
	if err != nil {
		return nil, nil, nil, err
	}
	row, err = q.LockTournament(ctx, db.LockTournamentParams{ID: row.ID, GroupID: groupID})
	if err != nil {
		return nil, nil, nil, err
	}
	t, err := tournamentFromRow(row)
	if err != nil {
		return nil, nil, nil, err
	}
	stage, fixture := t.Fixture(id)
	return &t, stage, fixture, nil
}
func sameIDs(a, b []string) bool {
	a, b = slices.Clone(a), slices.Clone(b)
	slices.Sort(a)
	slices.Sort(b)
	return slices.Equal(a, b)
}
func validFixtureOps(t *tournament.Tournament, f *tournament.Fixture, ops []liveMatchOpDTO) bool {
	if f == nil || f.BlueTeamID == nil || f.RedTeamID == nil {
		return false
	}
	blue, red := t.Team(*f.BlueTeamID), t.Team(*f.RedTeamID)
	for _, op := range ops {
		switch deref(op.Type) {
		case "SET_TEAMS":
			if !sameIDs(op.BluePlayerIDs, blue.PlayerIDs) || !sameIDs(op.RedPlayerIDs, red.PlayerIDs) {
				return false
			}
		case "SET_PLAYER_TEAM":
			if op.PlayerID == nil || op.Team == nil {
				return false
			}
			ids := blue.PlayerIDs
			if *op.Team == "red" {
				ids = red.PlayerIDs
			}
			if !slices.Contains(ids, *op.PlayerID) {
				return false
			}
		}
	}
	return true
}
func validFixtureInput(t *tournament.Tournament, f *tournament.Fixture, in matchInput) bool {
	if f == nil || f.BlueTeamID == nil || f.RedTeamID == nil || len(in.teams) != 2 {
		return false
	}
	ids := func(team *teamInput) []string {
		out := []string{}
		if team != nil {
			for _, m := range team.members {
				if m != nil {
					out = append(out, deref(m.playerID))
				}
			}
		}
		return out
	}
	return sameIDs(ids(in.teams[0]), t.Team(*f.BlueTeamID).PlayerIDs) && sameIDs(ids(in.teams[1]), t.Team(*f.RedTeamID).PlayerIDs)
}
func (s *Server) recordTournamentResult(ctx context.Context, q *db.Queries, t *tournament.Tournament, f *tournament.Fixture, matchID string) error {
	match, err := q.GetMatch(ctx, matchID)
	if err != nil {
		return err
	}
	full, err := s.loadFullMatches(ctx, q, []db.Match{match})
	if err != nil {
		return err
	}
	ids := []string{}
	for _, mv := range full[0].moves {
		ids = append(ids, deref(mv.MoveID))
	}
	rows, err := q.RuleMovesByIDs(ctx, ids)
	if err != nil {
		return err
	}
	moves := map[string]db.RuleMove{}
	for _, mv := range rows {
		moves[mv.ID] = mv
	}
	overview, err := full[0].overview(moves)
	if err != nil {
		return err
	}
	f.ResultMatchID, f.Status, f.BlueScore, f.RedScore = &matchID, "FINISHED", overview.BlueTeam.Points, overview.RedTeam.Points
	for _, mv := range full[0].moves {
		if !moves[deref(mv.MoveID)].FinishingMove || mv.Value <= 0 {
			continue
		}
		for _, tm := range full[0].members {
			if tm.ID == deref(mv.TeamMemberID) {
				if deref(tm.TeamID) == overview.BlueTeam.TeamID {
					f.WinnerTeamID = f.BlueTeamID
				} else {
					f.WinnerTeamID = f.RedTeamID
				}
			}
		}
	}
	t.Advance(s.now())
	return saveTournament(ctx, q, *t)
}

// Changing an early result is safe until a dependent stage begins. Clear its
// unplayed pairings and seed them again from the corrected standings.
func (s *Server) tournamentResultEdit(ctx context.Context, q *db.Queries, groupID string, match db.Match) (*tournament.Tournament, *tournament.Fixture, response, error) {
	if match.TournamentID == nil {
		return nil, nil, nil, nil
	}
	if _, err := q.LockTournamentGroup(ctx, groupID); err != nil {
		return nil, nil, nil, err
	}
	row, err := q.LockTournament(ctx, db.LockTournamentParams{ID: *match.TournamentID, GroupID: groupID})
	if err != nil {
		return nil, nil, nil, err
	}
	t, err := tournamentFromRow(row)
	if err != nil {
		return nil, nil, nil, err
	}
	index := -1
	var fixture *tournament.Fixture
	for i := range t.Stages {
		for j := range t.Stages[i].Matches {
			f := &t.Stages[i].Matches[j]
			if f.ResultMatchID != nil && *f.ResultMatchID == match.ID {
				index, fixture = i, f
			}
		}
	}
	if fixture == nil {
		return nil, nil, fail(errTournamentFixture), nil
	}
	for i := index + 1; i < len(t.Stages); i++ {
		for _, f := range t.Stages[i].Matches {
			if f.Status == "IN_PROGRESS" || f.Status == "FINISHED" {
				return nil, nil, fail(errTournamentLocked), nil
			}
		}
	}
	if t.Status == "FINISHED" {
		active, err := q.ActiveTournamentExists(ctx, groupID)
		if err != nil {
			return nil, nil, nil, err
		}
		if active {
			return nil, nil, fail(errTournamentActive), nil
		}
		t.Status, t.EndedAt, t.WinnerTeamID = "ACTIVE", nil, nil
	}
	for i := index + 1; i < len(t.Stages); i++ {
		t.Stages[i].TeamIDs = []string{}
		for j := range t.Stages[i].Matches {
			id := t.Stages[i].Matches[j].ID
			t.Stages[i].Matches[j] = tournament.Fixture{ID: id, Status: "BLOCKED"}
		}
	}
	return &t, fixture, nil, nil
}
