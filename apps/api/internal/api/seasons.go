package api

import (
	"context"
	"fmt"
	"math"
	"strconv"

	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

func (s *Server) loadSeason(ctx context.Context, q *db.Queries, id string) (season, bool, error) {
	row, err := q.GetSeason(ctx, id)
	if notFound(err) {
		return season{}, false, nil
	}
	if err != nil {
		return season{}, false, err
	}
	return seasonFromRow(row), true, nil
}

// activeSeason checks that seasonID is a season of groupID that has not
// ended yet. A non-nil response is the error to answer with.
func (s *Server) activeSeason(ctx context.Context, q *db.Queries, groupID, seasonID string) (db.Group, season, response) {
	group, err := q.GetGroup(ctx, groupID)
	if notFound(err) {
		return group, season{}, fail(errGroupNotFound)
	}
	if err != nil {
		return group, season{}, internal(err)
	}
	sn, found, err := s.loadSeason(ctx, q, seasonID)
	if err != nil {
		return group, sn, internal(err)
	}
	if !found {
		return group, sn, fail(errSeasonNotFound)
	}
	if sn.GroupID == nil {
		return group, sn, internalf("season %s has no group", sn.ID)
	}
	if *sn.GroupID != group.ID {
		return group, sn, fail(errSeasonNotOfGroup)
	}
	if sn.EndDate != nil {
		return group, sn, fail(errSeasonAlreadyEnded)
	}
	return group, sn, nil
}

// seasonOfGroup is the cheap existence check most read endpoints start with.
func (s *Server) seasonOfGroup(r *request, seasonID string) response {
	exists, err := s.q.SeasonExistsInGroup(r.Context(), db.SeasonExistsInGroupParams{ID: seasonID, GroupID: ptr(r.path("groupId"))})
	if err != nil {
		return internal(err)
	}
	if !exists {
		return fail(errSeasonNotOfGroup)
	}
	return nil
}

// seasonListDTO is a season in the season list, with its match count so the
// app can leave out empty past seasons without loading their matches.
type seasonListDTO struct {
	seasonDTO
	NumMatches int64 `json:"numMatches"`
}

func (s *Server) listSeasons(r *request) response {
	groupID := ptr(r.path("groupId"))
	rows, err := s.q.SeasonsByGroup(r.Context(), groupID)
	if err != nil {
		return internal(err)
	}
	counts, err := s.q.MatchCountsBySeason(r.Context(), groupID)
	if err != nil {
		return internal(err)
	}
	matches := make(map[string]int64, len(counts))
	for _, c := range counts {
		matches[deref(c.SeasonID)] = c.Matches
	}
	out := make([]seasonListDTO, len(rows))
	for i, row := range rows {
		out[i] = seasonListDTO{seasonDTO: seasonFromRow(db.GetSeasonRow(row)).dto(), NumMatches: matches[row.ID]}
	}
	return ok(out)
}

func (s *Server) getSeason(r *request) response {
	if res := s.seasonOfGroup(r, r.path("id")); res != nil {
		return res
	}
	sn, found, err := s.loadSeason(r.Context(), s.q, r.path("id"))
	if err != nil {
		return internal(err)
	}
	if !found {
		return fail(errSeasonNotFound)
	}
	return ok(sn.dto())
}

func (s *Server) updateSeason(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	settingsBody, err := o.child("seasonSettings")
	if err != nil {
		return springError(400)
	}
	var update settingsUpdate
	if settingsBody != nil {
		if update, err = parseSettingsUpdate(settingsBody); err != nil {
			return springError(400)
		}
	}

	groupID, seasonID := r.path("groupId"), r.path("id")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	if settingsBody == nil {
		return fail(errInvalidSeasonDto)
	}
	ctx := r.Context()
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		_, sn, res := s.activeSeason(ctx, q, groupID, seasonID)
		if res != nil {
			return res, nil
		}
		current := sn.Settings
		if current == nil {
			return nil, fmt.Errorf("season %s has no settings", sn.ID)
		}
		minMatches := valueOr(update.minMatchesToQualify, current.MinMatchesToQualify)
		minTeam := valueOr(update.minTeamSize, current.MinTeamSize)
		maxTeam := valueOr(update.maxTeamSize, current.MaxTeamSize)

		wake := &current.WakeTime
		if update.wakeTime != nil {
			parsed, valid := parseWakeTime(*update.wakeTime)
			if !valid {
				wake = nil
			} else {
				wake = &parsed
			}
		}
		if wake == nil {
			return fail(errSeasonWrongTimeFormat), nil
		}
		if minTeam > maxTeam {
			return fail(errSeasonWrongTeamSizes), nil
		}

		next := *current
		next.MinMatchesToQualify = clamp(minMatches, 0, 1000)
		next.MinTeamSize = clamp(minTeam, 1, 10)
		next.MaxTeamSize = clamp(maxTeam, 1, 10)
		if update.wakeTime != nil {
			next.WakeTime = *wake
		}
		if update.dailyLeaderboard != nil {
			next.DailyLeaderboard = update.dailyLeaderboard
		}
		if update.rankingAlgorithm != nil {
			next.RankingAlgorithm = update.rankingAlgorithm
		}
		for _, w := range []struct {
			update optionalWeight
			to     **float64
		}{{update.eloK, &next.Elo.K}, {update.eloKr, &next.Elo.KR}, {update.eloRingWeight, &next.Elo.RingWeight}, {update.eloSwing, &next.Elo.Swing}, {update.eloSpread, &next.Elo.Spread}} {
			if w.update.set {
				*w.to = w.update.value
			}
		}
		if err := q.UpdateSeasonSettings(ctx, db.UpdateSeasonSettingsParams{
			ID:                  next.ID,
			DailyLeaderboard:    next.DailyLeaderboard,
			MaxTeamSize:         next.MaxTeamSize,
			MinMatchesToQualify: next.MinMatchesToQualify,
			MinTeamSize:         next.MinTeamSize,
			RankingAlgorithm:    next.RankingAlgorithm,
			WakeTime:            &next.WakeTime,
			EloK:                next.Elo.K,
			EloKr:               next.Elo.KR,
			EloRingWeight:       next.Elo.RingWeight,
			EloSwing:            next.Elo.Swing,
			EloSpread:           next.Elo.Spread,
		}); err != nil {
			return nil, err
		}
		sn.Settings = &next
		return ok(sn.dto()), nil
	})
	if o, isOK := res.(okResponse); isOK {
		dto := o.data.(seasonDTO)
		s.hub.Publish(deref(dto.GroupID), realtime.Seasons, "seasonUpdate", dto)
	}
	return res
}

// settingsUpdate is the SeasonSettingsDto of an update. A missing wakeTime
// is "00:00" (the Java DTO's default); an explicit null keeps the old one. A
// missing Elo weight keeps the old one (apps from before them send none);
// null is back to the default.
type settingsUpdate struct {
	minMatchesToQualify, minTeamSize, maxTeamSize   *int32
	rankingAlgorithm, dailyLeaderboard              *int16
	wakeTime                                        *string
	eloK, eloKr, eloRingWeight, eloSwing, eloSpread optionalWeight
}

// optionalWeight is an Elo weight of an update: set when the key is there,
// value nil for null (the default).
type optionalWeight struct {
	set   bool
	value *float64
}

func parseSettingsUpdate(o object) (settingsUpdate, error) {
	var u settingsUpdate
	var err error
	if u.minMatchesToQualify, err = o.integer("minMatchesToQualify"); err != nil {
		return u, err
	}
	if u.minTeamSize, err = o.integer("minTeamSize"); err != nil {
		return u, err
	}
	if u.maxTeamSize, err = o.integer("maxTeamSize"); err != nil {
		return u, err
	}
	if u.rankingAlgorithm, err = o.enum("rankingAlgorithm", rankingAlgorithms); err != nil {
		return u, err
	}
	if u.dailyLeaderboard, err = o.enum("dailyLeaderboard", dailyLeaderboards); err != nil {
		return u, err
	}
	if !o.has("wakeTime") {
		u.wakeTime = ptr("00:00")
	} else if u.wakeTime, err = o.str("wakeTime"); err != nil {
		return u, err
	}
	weight := func(key string, lo, hi float64) (optionalWeight, error) {
		v, set, err := o.optionalFloat(key)
		if v != nil {
			*v = math.Min(math.Max(*v, lo), hi)
		}
		return optionalWeight{set: set, value: v}, err
	}
	if u.eloK, err = weight("eloK", 0, 1000); err != nil {
		return u, err
	}
	if u.eloKr, err = weight("eloKr", 0, 1000); err != nil {
		return u, err
	}
	if u.eloRingWeight, err = weight("eloRingWeight", 0, 2); err != nil {
		return u, err
	}
	if u.eloSwing, err = weight("eloSwing", 0.1, 20); err != nil {
		return u, err
	}
	if u.eloSpread, err = weight("eloSpread", 100, 100000); err != nil {
		return u, err
	}
	return u, nil
}

// parseWakeTime accepts "HH:mm" (24:00 means midnight, as with java.time's
// default resolver) or "HH:mm:ss", which the API sends and the app sends back
// with every settings update; seconds are dropped. It returns HH:MM:SS.
func parseWakeTime(s string) (string, bool) {
	if len(s) == 8 && s[5] == ':' && isDigits(s[6:]) && s[6:] < "60" {
		s = s[:5]
	}
	if len(s) != 5 || s[2] != ':' {
		return "", false
	}
	h, err1 := strconv.Atoi(s[:2])
	m, err2 := strconv.Atoi(s[3:])
	if err1 != nil || err2 != nil || !isDigits(s[:2]) || !isDigits(s[3:]) || m > 59 {
		return "", false
	}
	if h == 24 && m == 0 {
		h = 0
	}
	if h > 23 {
		return "", false
	}
	return fmt.Sprintf("%02d:%02d:00", h, m), true
}

func isDigits(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func valueOr(v *int32, fallback int32) int32 {
	if v == nil {
		return fallback
	}
	return *v
}

func clamp(v, lo, hi int32) int32 { return min(max(v, lo), hi) }

func (s *Server) startSeason(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	oldName, err := o.str("oldSeasonName")
	if err != nil {
		return springError(400)
	}
	moves, hasNull, err := parseRuleMoveList(o, "ruleMoves")
	if err != nil {
		return springError(400)
	}
	if nameInvalid(oldName) {
		return fail(errInvalidSeasonName)
	}
	if hasNull {
		return internalf("rule move list contains null")
	}
	if invalidSeasonMoves(moves) {
		return fail(errInvalidRuleMoves)
	}

	groupID := r.path("groupId")
	ctx := r.Context()
	var event seasonStartDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		memberID, err := s.membershipID(r, q, groupID)
		if err != nil {
			return nil, err
		}
		if memberID == "" {
			return fail(errAuthUserNotInGroup), nil
		}
		group, err := q.LockTournamentGroup(ctx, groupID)
		if notFound(err) {
			return fail(errGroupNotFound), nil
		}
		if err != nil {
			return nil, err
		}

		activeTournament, err := q.ActiveTournamentExists(ctx, groupID)
		if err != nil {
			return nil, err
		}
		if activeTournament {
			return fail(errTournamentPlaying), nil
		}
		var old *season
		if group.ActiveSeasonID != nil {
			sn, found, err := s.loadSeason(ctx, q, *group.ActiveSeasonID)
			if err != nil {
				return nil, err
			}
			if found {
				old = &sn
			}
		}

		now := s.now()
		newSeason := season{ID: uuid.NewString(), StartDate: &now, GroupID: &groupID, CreatedBy: &memberID}
		newSettings := defaultSettings(uuid.NewString())
		if old != nil && old.Settings != nil {
			copied := *old.Settings
			copied.ID = newSettings.ID
			newSettings = copied
		}
		newSeason.Settings = &newSettings
		if err := insertSettings(ctx, q, newSettings); err != nil {
			return nil, err
		}
		if err := q.InsertSeason(ctx, db.InsertSeasonParams{ID: newSeason.ID, GroupID: &groupID, StartDate: &now, SeasonSettingsID: &newSettings.ID, CreatedBy: &memberID}); err != nil {
			return nil, err
		}

		if old != nil {
			ended := s.now()
			if err := q.EndSeason(ctx, db.EndSeasonParams{ID: old.ID, Name: oldName, EndDate: &ended}); err != nil {
				return nil, err
			}
			old.Name, old.EndDate = oldName, &ended

			// Carry every active player over with the stats they finished with.
			board, res := s.leaderboardFor(ctx, q, toGroupDTO(group), "season", true, old.ID, nil)
			if failed, isInternal := res.(internalError); isInternal {
				return nil, failed.err
			}
			if res != nil {
				return fail(errGeneric), nil
			}
			var carried []newPlayer
			for _, e := range board.active {
				carried = append(carried, newPlayer{profileID: deref(e.Player.ProfileID), seasonID: newSeason.ID, active: e.Player.Active, stats: *e.Stats})
			}
			if err := insertPlayers(ctx, q, carried); err != nil {
				return nil, err
			}
			if err := q.CopyRules(ctx, db.CopyRulesParams{NewSeasonID: &newSeason.ID, OldSeasonID: &old.ID}); err != nil {
				return nil, err
			}
		}

		newMoves := make([]defaultMove, len(moves))
		for i, m := range moves {
			newMoves[i] = defaultMove{name: *m.name, pointsForScorer: m.pointsForScorer, pointsForTeam: m.pointsForTeam, finish: m.finish, cups: m.cups, isDefault: m.defaultOr(false)}
		}
		if err := insertRuleMoves(ctx, q, newSeason.ID, newMoves); err != nil {
			return nil, err
		}
		if err := q.SetGroupActiveSeason(ctx, db.SetGroupActiveSeasonParams{ID: groupID, ActiveSeasonID: &newSeason.ID}); err != nil {
			return nil, err
		}

		event.NewSeason = newSeason.dto()
		if old != nil {
			oldDTO := old.dto()
			event.OldSeason = &oldDTO
		}
		return ok(event.NewSeason), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.Seasons, "seasonStart", event)
	}
	return res
}

func defaultSettings(id string) settings {
	return settings{
		ID:                  id,
		MinMatchesToQualify: 1,
		MinTeamSize:         1,
		MaxTeamSize:         10,
		RankingAlgorithm:    &rankingAverage,
		DailyLeaderboard:    &dailyWakeTime,
		WakeTime:            "00:00:00",
	}
}

func insertSettings(ctx context.Context, q *db.Queries, s settings) error {
	return q.InsertSeasonSettings(ctx, db.InsertSeasonSettingsParams{
		ID:                  s.ID,
		DailyLeaderboard:    s.DailyLeaderboard,
		MaxTeamSize:         s.MaxTeamSize,
		MinMatchesToQualify: s.MinMatchesToQualify,
		MinTeamSize:         s.MinTeamSize,
		RankingAlgorithm:    s.RankingAlgorithm,
		WakeTime:            &s.WakeTime,
		EloK:                s.Elo.K,
		EloKr:               s.Elo.KR,
		EloRingWeight:       s.Elo.RingWeight,
		EloSwing:            s.Elo.Swing,
		EloSpread:           s.Elo.Spread,
	})
}

// newPlayer is a player to create together with its statistics row.
type newPlayer struct {
	profileID string
	seasonID  string
	active    bool
	stats     leaderboard.Stats
}

func freshStats() leaderboard.Stats { return leaderboard.FreshStats() }

func insertPlayers(ctx context.Context, q *db.Queries, players []newPlayer) error {
	if len(players) == 0 {
		return nil
	}
	stats := make([]db.InsertStatisticsParams, len(players))
	rows := make([]db.InsertPlayersParams, len(players))
	for i, p := range players {
		statsID := uuid.NewString()
		wins := p.stats.Wins
		stats[i] = db.InsertStatisticsParams{
			ID: statsID, Points: p.stats.Points, Matches: p.stats.Matches, Wins: &wins, Moves: p.stats.Moves,
			TotalTeamSize: p.stats.TotalTeamSize, AvgPointsPerMatch: p.stats.AvgPointsPerMatch,
			AvgTeamSize: p.stats.AvgTeamSize, Elo: p.stats.Elo,
		}
		rows[i] = db.InsertPlayersParams{ID: uuid.NewString(), ActiveThisSeason: p.active, ProfileID: ptr(p.profileID), SeasonID: ptr(p.seasonID), StatisticsID: &statsID}
	}
	if _, err := q.InsertStatistics(ctx, stats); err != nil {
		return err
	}
	_, err := q.InsertPlayers(ctx, rows)
	return err
}

func insertRuleMoves(ctx context.Context, q *db.Queries, seasonID string, moves []defaultMove) error {
	if len(moves) == 0 {
		return nil
	}
	rows := make([]db.InsertRuleMovesParams, len(moves))
	hasDefault := false
	for i, m := range moves {
		cups := defaultCupsFor(&m.name, m.finish)
		if m.cups != nil {
			cups = *m.cups
		}
		// a season has one default move: the first one marked
		isDefault := m.isDefault && !hasDefault
		hasDefault = hasDefault || isDefault
		rows[i] = db.InsertRuleMovesParams{ID: uuid.NewString(), FinishingMove: m.finish, Name: ptr(m.name), PointsForScorer: m.pointsForScorer, PointsForTeam: m.pointsForTeam, SeasonID: &seasonID, Cups: &cups, DefaultMove: isDefault}
	}
	_, err := q.InsertRuleMoves(ctx, rows)
	return err
}
