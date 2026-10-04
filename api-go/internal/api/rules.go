package api

import (
	"errors"

	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

func (s *Server) listRules(r *request) response {
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	rows, err := s.q.RulesBySeason(r.Context(), &seasonID)
	if err != nil {
		return internal(err)
	}
	out := make([]ruleDTO, len(rows))
	for i, rule := range rows {
		out[i] = toRuleDTO(rule)
	}
	return ok(out)
}

// writeRules replaces the season's rule set; the order of the request is
// the order the rules are stored in.
func (s *Server) writeRules(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	items, isList := body.([]any)
	if !isList {
		return springError(400)
	}
	type ruleInput struct{ title, description *string }
	rules := make([]*ruleInput, len(items))
	for i, item := range items {
		if item == nil {
			continue
		}
		o, err := asObject(item)
		if err != nil {
			return springError(400)
		}
		title, err1 := o.str("title")
		description, err2 := o.str("description")
		if err1 != nil || err2 != nil {
			return springError(400)
		}
		rules[i] = &ruleInput{title, description}
	}

	groupID, seasonID := r.path("groupId"), r.path("seasonId")
	ctx := r.Context()
	var written []ruleDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		if _, _, res := s.activeSeason(ctx, q, groupID, seasonID); res != nil {
			return res, nil
		}
		for _, rule := range rules {
			if rule == nil {
				return nil, errors.New("rule is null")
			}
			if rule.title == nil || javaTrimEmpty(*rule.title) || rule.description == nil || javaTrimEmpty(*rule.description) {
				return fail(errRuleInvalidDto), nil
			}
		}
		memberID, err := s.membershipID(r, q, groupID)
		if err != nil {
			return nil, err
		}
		if memberID == "" {
			return springError(403), nil
		}
		if err := q.DeleteRulesBySeason(ctx, &seasonID); err != nil {
			return nil, err
		}
		rows := make([]db.InsertRulesParams, len(rules))
		written = make([]ruleDTO, len(rules))
		for i, rule := range rules {
			rows[i] = db.InsertRulesParams{ID: uuid.NewString(), Title: rule.title, Description: rule.description, SeasonID: &seasonID, CreatedBy: &memberID, Position: ptr(int32(i))}
			written[i] = ruleDTO{ID: rows[i].ID, Title: rule.title, Description: rule.description, CreatedByID: &memberID, SeasonID: &seasonID}
		}
		if len(rows) > 0 {
			if _, err := q.InsertRules(ctx, rows); err != nil {
				return nil, err
			}
		}
		return ok(written), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.Rules, "rulesWrite", written)
	}
	return res
}

func (s *Server) listRuleMoves(r *request) response {
	seasonID := r.path("seasonId")
	if res := s.seasonOfGroup(r, seasonID); res != nil {
		return res
	}
	rows, err := s.q.RuleMovesBySeason(r.Context(), &seasonID)
	if err != nil {
		return internal(err)
	}
	out := make([]ruleMoveDTO, len(rows))
	for i, m := range rows {
		out[i] = toRuleMoveDTO(m)
	}
	return ok(out)
}

// ruleMoveInput is a RuleMoveCreateDto.
type ruleMoveInput struct {
	name            *string
	pointsForScorer int32
	pointsForTeam   int32
	finish          bool
	// cups is optional; older apps don't send it.
	cups *int32
}

func (m ruleMoveInput) invalid() bool {
	return m.name == nil || javaTrimEmpty(*m.name) || m.pointsForTeam < 0 || m.pointsForScorer < 0 || (m.cups != nil && *m.cups < 0)
}

func (m ruleMoveInput) cupsOrDefault() int32 {
	if m.cups != nil {
		return *m.cups
	}
	return defaultCupsFor(m.name, m.finish)
}

func readRuleMove(o object) (ruleMoveInput, error) {
	name, err := o.str("name")
	team, err1 := o.primitiveInt("pointsForTeam")
	scorer, err2 := o.primitiveInt("pointsForScorer")
	finish, err3 := o.primitiveBool("finishingMove")
	cups, err4 := o.integer("cups")
	if err := errors.Join(err, err1, err2, err3, err4); err != nil {
		return ruleMoveInput{}, err
	}
	return ruleMoveInput{name: name, pointsForScorer: scorer, pointsForTeam: team, finish: finish, cups: cups}, nil
}

// parseRuleMoveList binds a List<RuleMoveCreateDto>; moves is nil for a
// missing or null list. hasNull reports null elements.
func parseRuleMoveList(o object, key string) (moves []ruleMoveInput, hasNull bool, err error) {
	items, present, err := o.list(key)
	if err != nil || !present {
		return nil, false, err
	}
	moves = make([]ruleMoveInput, 0, len(items))
	for _, item := range items {
		if item == nil {
			hasNull = true
			continue
		}
		mo, err := asObject(item)
		if err != nil {
			return nil, false, err
		}
		m, err := readRuleMove(mo)
		if err != nil {
			return nil, false, err
		}
		moves = append(moves, m)
	}
	return moves, hasNull, nil
}

// invalidSeasonMoves: at least one finishing and one normal move, all valid.
func invalidSeasonMoves(moves []ruleMoveInput) bool {
	if moves == nil {
		return true
	}
	finishing := 0
	for _, m := range moves {
		if m.finish {
			finishing++
		}
	}
	if finishing == 0 || finishing == len(moves) {
		return true
	}
	for _, m := range moves {
		if m.invalid() {
			return true
		}
	}
	return false
}

func (s *Server) createRuleMove(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	move, err := readRuleMove(o)
	if err != nil {
		return springError(400)
	}
	groupID, seasonID := r.path("groupId"), r.path("seasonId")
	ctx := r.Context()
	var created ruleMoveDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		if _, _, res := s.activeSeason(ctx, q, groupID, seasonID); res != nil {
			return res, nil
		}
		if move.invalid() {
			return fail(errRuleMoveInvalidDto), nil
		}
		row, err := q.InsertRuleMove(ctx, db.InsertRuleMoveParams{
			ID: uuid.NewString(), FinishingMove: move.finish, Name: move.name,
			PointsForScorer: move.pointsForScorer, PointsForTeam: move.pointsForTeam, SeasonID: &seasonID, Cups: ptr(move.cupsOrDefault()),
		})
		if err != nil {
			return nil, err
		}
		created = toRuleMoveDTO(row)
		return ok(created), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.RuleMoves, "ruleMovesCreate", created)
	}
	return res
}

func (s *Server) updateRuleMove(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	move, err := readRuleMove(o)
	if err != nil {
		return springError(400)
	}
	groupID, seasonID, moveID := r.path("groupId"), r.path("seasonId"), r.path("ruleMoveId")
	ctx := r.Context()
	var updated ruleMoveDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		if _, _, res := s.activeSeason(ctx, q, groupID, seasonID); res != nil {
			return res, nil
		}
		if move.invalid() {
			return fail(errRuleMoveInvalidDto), nil
		}
		if _, err := q.GetRuleMove(ctx, moveID); notFound(err) {
			return fail(errRuleMoveNotFound), nil
		} else if err != nil {
			return nil, err
		}
		inSeason, err := q.RuleMoveExistsInSeason(ctx, db.RuleMoveExistsInSeasonParams{ID: moveID, SeasonID: &seasonID})
		if err != nil {
			return nil, err
		}
		if !inSeason {
			return fail(errRuleMoveValidationFailed), nil
		}
		row, err := q.UpdateRuleMove(ctx, db.UpdateRuleMoveParams{ID: moveID, Name: move.name, PointsForTeam: move.pointsForTeam, PointsForScorer: move.pointsForScorer, FinishingMove: move.finish, Cups: ptr(move.cupsOrDefault())})
		if err != nil {
			return nil, err
		}
		updated = toRuleMoveDTO(row)
		return ok(updated), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.RuleMoves, "ruleMovesUpdate", updated)
	}
	return res
}
