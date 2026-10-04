package api

import (
	"context"
	"encoding/json"
	"regexp"
	"slices"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// A live match is an append-only, server-sequenced log of ops. The server
// assigns the order (seq) but does not interpret the game, so it only
// validates the shape of each op.

const (
	maxOpsPerRequest   = 50
	maxOpsPerLiveMatch = 2000
	maxDelta           = 20
	maxCupsPerHit      = 10
	maxCupCoordinate   = 9
	maxTeamSize        = 10
)

const liveInProgress = "IN_PROGRESS"

var (
	liveOpTypes = []string{"SET_TEAMS", "SET_PLAYER_TEAM", "ADJUST_MOVE", "RECORD_CUP_HIT", "UNDO_CUP_HIT"}
	uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

type cupPositionDTO struct {
	X *int32 `json:"x"`
	Y *int32 `json:"y"`
}

// liveMatchOpDTO is used for input and output. seq and createdAt are set by
// the server and ignored on input. Which of the typed fields are set depends
// on the type; the rest stay null.
type liveMatchOpDTO struct {
	ID            string           `json:"id"`
	Seq           *int64           `json:"seq"`
	Type          *string          `json:"type"`
	CreatedAt     *time.Time       `json:"createdAt"`
	PlayerID      *string          `json:"playerId"`
	Team          *string          `json:"team"`
	MoveID        *string          `json:"moveId"`
	Delta         *int32           `json:"delta"`
	Cups          []cupPositionDTO `json:"cups"`
	Cup           *cupPositionDTO  `json:"cup"`
	FinishMoveID  *string          `json:"finishMoveId"`
	RedPlayerIDs  []string         `json:"redPlayerIds"`
	BluePlayerIDs []string         `json:"bluePlayerIds"`
}

type liveMatchDTO struct {
	ID              string           `json:"id"`
	GroupID         string           `json:"groupId"`
	SeasonID        string           `json:"seasonId"`
	Status          string           `json:"status"`
	StartedAt       *time.Time       `json:"startedAt"`
	LastActivityAt  *time.Time       `json:"lastActivityAt"`
	EndedAt         *time.Time       `json:"endedAt"`
	CreatedByUserID *string          `json:"createdByUserId"`
	LastSeq         int64            `json:"lastSeq"`
	ResultMatchID   *string          `json:"resultMatchId"`
	Ops             []liveMatchOpDTO `json:"ops"`
}

type liveMatchOpsResultDTO struct {
	LastSeq int64            `json:"lastSeq"`
	Ops     []liveMatchOpDTO `json:"ops"`
}

type liveMatchOpsEventDTO struct {
	LiveMatchID string           `json:"liveMatchId"`
	LastSeq     int64            `json:"lastSeq"`
	Ops         []liveMatchOpDTO `json:"ops"`
}

// ---- binding and validation ----

// parseLiveOps binds a JSON list of ops. A nil list (missing or null) is
// returned as nil; a null element becomes a nil entry, which is invalid.
func parseLiveOps(o object, key string) ([]*liveMatchOpDTO, bool, error) {
	items, present, err := o.list(key)
	if err != nil || !present {
		return nil, false, err
	}
	ops := make([]*liveMatchOpDTO, len(items))
	for i, item := range items {
		if item == nil {
			continue
		}
		op, err := asObject(item)
		if err != nil {
			return nil, false, err
		}
		if ops[i], err = parseLiveOp(op); err != nil {
			return nil, false, err
		}
	}
	return ops, true, nil
}

func parseLiveOp(o object) (*liveMatchOpDTO, error) {
	op := &liveMatchOpDTO{}
	id, err := o.str("id")
	if err != nil {
		return nil, err
	}
	op.ID = deref(id)
	typ, err := o.enum("type", liveOpTypes)
	if err != nil {
		return nil, err
	}
	op.Type = enumName(liveOpTypes, typ)
	if op.PlayerID, err = o.str("playerId"); err != nil {
		return nil, err
	}
	if op.Team, err = o.str("team"); err != nil {
		return nil, err
	}
	if op.MoveID, err = o.str("moveId"); err != nil {
		return nil, err
	}
	if op.Delta, err = o.integer("delta"); err != nil {
		return nil, err
	}
	if op.FinishMoveID, err = o.str("finishMoveId"); err != nil {
		return nil, err
	}
	cups, present, err := o.list("cups")
	if err != nil {
		return nil, err
	}
	if present {
		op.Cups = make([]cupPositionDTO, len(cups))
		for i, c := range cups {
			// a null cup stays {x: nil, y: nil}, which is invalid
			if c == nil {
				continue
			}
			co, err := asObject(c)
			if err != nil {
				return nil, err
			}
			if op.Cups[i], err = parseCup(co); err != nil {
				return nil, err
			}
		}
	}
	cup, err := o.child("cup")
	if err != nil {
		return nil, err
	}
	if cup != nil {
		c, err := parseCup(cup)
		if err != nil {
			return nil, err
		}
		op.Cup = &c
	}
	if op.RedPlayerIDs, err = parseIDList(o, "redPlayerIds"); err != nil {
		return nil, err
	}
	if op.BluePlayerIDs, err = parseIDList(o, "bluePlayerIds"); err != nil {
		return nil, err
	}
	return op, nil
}

func parseCup(o object) (cupPositionDTO, error) {
	x, err := o.integer("x")
	if err != nil {
		return cupPositionDTO{}, err
	}
	y, err := o.integer("y")
	return cupPositionDTO{X: x, Y: y}, err
}

// parseIDList binds a list of strings; a null element becomes "", which is
// not a UUID.
func parseIDList(o object, key string) ([]string, error) {
	items, present, err := o.strList(key)
	if err != nil || !present {
		return nil, err
	}
	out := make([]string, len(items))
	for i, s := range items {
		out[i] = deref(s)
	}
	return out, nil
}

func isUUID(s string) bool { return uuidPattern.MatchString(s) }

func isUUIDPtr(s *string) bool { return s != nil && isUUID(*s) }

func isTeam(s *string) bool { return s != nil && (*s == "red" || *s == "blue") }

func isCoordinate(v *int32) bool { return v != nil && *v >= 0 && *v <= maxCupCoordinate }

func isCup(c *cupPositionDTO) bool { return c != nil && isCoordinate(c.X) && isCoordinate(c.Y) }

func isUUIDList(ids []string) bool {
	return ids != nil && len(ids) <= maxTeamSize && !slices.ContainsFunc(ids, func(s string) bool { return !isUUID(s) })
}

// normalizeLiveOp checks an op and returns it reduced to the fields of its
// type, so nothing else is stored or broadcast. ok is false for an invalid op.
func normalizeLiveOp(op *liveMatchOpDTO) (liveMatchOpDTO, bool) {
	if op == nil || !isUUID(op.ID) || op.Type == nil {
		return liveMatchOpDTO{}, false
	}
	out := liveMatchOpDTO{ID: op.ID, Type: op.Type}
	switch *op.Type {
	case "SET_TEAMS":
		if !isUUIDList(op.RedPlayerIDs) || !isUUIDList(op.BluePlayerIDs) {
			return out, false
		}
		out.RedPlayerIDs, out.BluePlayerIDs = op.RedPlayerIDs, op.BluePlayerIDs
	case "SET_PLAYER_TEAM":
		// a null team removes the player from the match
		if !isUUIDPtr(op.PlayerID) || (op.Team != nil && !isTeam(op.Team)) {
			return out, false
		}
		out.PlayerID, out.Team = op.PlayerID, op.Team
	case "ADJUST_MOVE":
		if !isUUIDPtr(op.PlayerID) || !isUUIDPtr(op.MoveID) || op.Delta == nil || *op.Delta == 0 || *op.Delta > maxDelta || *op.Delta < -maxDelta {
			return out, false
		}
		out.PlayerID, out.MoveID, out.Delta = op.PlayerID, op.MoveID, op.Delta
	case "RECORD_CUP_HIT":
		if !isTeam(op.Team) || !isUUIDPtr(op.PlayerID) || !isUUIDPtr(op.MoveID) ||
			len(op.Cups) == 0 || len(op.Cups) > maxCupsPerHit ||
			slices.ContainsFunc(op.Cups, func(c cupPositionDTO) bool { return !isCup(&c) }) ||
			(op.FinishMoveID != nil && !isUUID(*op.FinishMoveID)) {
			return out, false
		}
		out.Team, out.PlayerID, out.MoveID, out.Cups, out.FinishMoveID = op.Team, op.PlayerID, op.MoveID, op.Cups, op.FinishMoveID
	case "UNDO_CUP_HIT":
		if !isTeam(op.Team) || !isCup(op.Cup) {
			return out, false
		}
		out.Team, out.Cup = op.Team, op.Cup
	default:
		return out, false
	}
	return out, true
}

// normalizeLiveOps validates a request's ops. ok is false when the list is
// missing, too long or has an invalid op.
func normalizeLiveOps(ops []*liveMatchOpDTO, present bool) ([]liveMatchOpDTO, bool) {
	if !present || len(ops) > maxOpsPerRequest {
		return nil, false
	}
	out := make([]liveMatchOpDTO, len(ops))
	for i, op := range ops {
		var ok bool
		if out[i], ok = normalizeLiveOp(op); !ok {
			return nil, false
		}
	}
	return out, true
}

// ---- stored form ----

// opPayload is what the payload column holds: the JSON of the op's own
// fields, without the ones that have their own columns.
func opPayload(op liveMatchOpDTO) (string, error) {
	raw, err := json.Marshal(op)
	if err != nil {
		return "", err
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return "", err
	}
	for _, k := range []string{"id", "seq", "type", "createdAt"} {
		delete(fields, k)
	}
	for k, v := range fields {
		if string(v) == "null" {
			delete(fields, k)
		}
	}
	out, err := json.Marshal(fields)
	return string(out), err
}

func toLiveMatchOpDTO(row db.LiveMatchOp) (liveMatchOpDTO, error) {
	var dto liveMatchOpDTO
	if err := json.Unmarshal([]byte(row.Payload), &dto); err != nil {
		return dto, err
	}
	dto.ID, dto.Seq, dto.Type, dto.CreatedAt = row.ID, &row.Seq, &row.Type, utc(&row.CreatedAt)
	return dto, nil
}

func toLiveMatchDTO(lm db.LiveMatch, userID *string, ops []liveMatchOpDTO) liveMatchDTO {
	if ops == nil {
		ops = []liveMatchOpDTO{}
	}
	return liveMatchDTO{
		ID:              lm.ID,
		GroupID:         lm.GroupID,
		SeasonID:        lm.SeasonID,
		Status:          lm.Status,
		StartedAt:       utc(&lm.StartedAt),
		LastActivityAt:  utc(&lm.LastActivityAt),
		EndedAt:         utc(lm.EndedAt),
		CreatedByUserID: userID,
		LastSeq:         lm.LastSeq,
		ResultMatchID:   lm.ResultMatchID,
		Ops:             ops,
	}
}

// liveMatchOps loads the ops of live matches, in seq order, by live match.
func liveMatchOps(ctx context.Context, q *db.Queries, ids []string) (map[string][]liveMatchOpDTO, error) {
	rows, err := q.LiveMatchOpsByLiveMatchIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := map[string][]liveMatchOpDTO{}
	for _, row := range rows {
		dto, err := toLiveMatchOpDTO(row)
		if err != nil {
			return nil, err
		}
		out[row.LiveMatchID] = append(out[row.LiveMatchID], dto)
	}
	return out, nil
}

// loadLiveMatchDTO reads a live match with its ops.
func loadLiveMatchDTO(ctx context.Context, q *db.Queries, id string) (liveMatchDTO, error) {
	row, err := q.GetLiveMatch(ctx, id)
	if err != nil {
		return liveMatchDTO{}, err
	}
	ops, err := liveMatchOps(ctx, q, []string{id})
	if err != nil {
		return liveMatchDTO{}, err
	}
	return toLiveMatchDTO(row.LiveMatch, row.CreatedByUserID, ops[id]), nil
}

// appended is the outcome of appendLiveMatchOps: every requested op as
// stored (once each, in seq order) and the ones that are new.
type appended struct {
	lastSeq int64
	all     []liveMatchOpDTO
	added   []liveMatchOpDTO
}

// appendLiveMatchOps stores ops that are already validated. The caller holds
// the row lock of the live match (or has just inserted it), so seqs are
// assigned one request at a time and stay gapless. An op id that exists is not
// stored again: its stored version is returned (an idempotent retry). A non-nil
// response is the error to answer with; the transaction must roll back.
func (s *Server) appendLiveMatchOps(ctx context.Context, q *db.Queries, liveMatchID string, lastSeq int64, memberID string, ops []liveMatchOpDTO) (appended, response, error) {
	ids := make([]string, 0, len(ops))
	for _, op := range ops {
		if !slices.Contains(ids, op.ID) {
			ids = append(ids, op.ID)
		}
	}
	existingRows, err := q.LiveMatchOpsByIDs(ctx, ids)
	if err != nil {
		return appended{}, nil, err
	}
	existing := map[string]liveMatchOpDTO{}
	for _, row := range existingRows {
		// op ids are global, so one of another live match can't be a retry
		if row.LiveMatchID != liveMatchID {
			return appended{}, fail(errLiveMatchInvalidOps), nil
		}
		dto, err := toLiveMatchOpDTO(row)
		if err != nil {
			return appended{}, nil, err
		}
		existing[row.ID] = dto
	}
	if lastSeq+int64(len(ids)-len(existing)) > maxOpsPerLiveMatch {
		return appended{}, fail(errLiveMatchTooManyOps), nil
	}

	now := s.now().Truncate(time.Microsecond)
	res := appended{lastSeq: lastSeq}
	for _, id := range ids {
		if op, found := existing[id]; found {
			res.all = append(res.all, op)
			continue
		}
		op := ops[slices.IndexFunc(ops, func(o liveMatchOpDTO) bool { return o.ID == id })]
		payload, err := opPayload(op)
		if err != nil {
			return appended{}, nil, err
		}
		res.lastSeq++
		n, err := q.InsertLiveMatchOp(ctx, db.InsertLiveMatchOpParams{
			ID: id, LiveMatchID: liveMatchID, Seq: res.lastSeq, CreatedAt: now, CreatedBy: memberID, Type: *op.Type, Payload: payload,
		})
		if err != nil {
			return appended{}, nil, err
		}
		if n == 0 {
			// the id was taken by another live match between the check and the insert
			return appended{}, fail(errLiveMatchInvalidOps), nil
		}
		op.Seq, op.CreatedAt = ptr(res.lastSeq), &now
		res.all = append(res.all, op)
		res.added = append(res.added, op)
	}
	if len(res.added) > 0 {
		if err := q.SetLiveMatchProgress(ctx, db.SetLiveMatchProgressParams{ID: liveMatchID, LastSeq: res.lastSeq, LastActivityAt: now}); err != nil {
			return appended{}, nil, err
		}
	}
	slices.SortFunc(res.all, func(a, b liveMatchOpDTO) int { return int(*a.Seq - *b.Seq) })
	return res, nil, nil
}

// ---- endpoints ----

func (s *Server) listLiveMatches(r *request) response {
	ctx := r.Context()
	rows, err := s.q.InProgressLiveMatchesByGroup(ctx, r.path("groupId"))
	if err != nil {
		return internal(err)
	}
	ids := make([]string, len(rows))
	for i, row := range rows {
		ids[i] = row.LiveMatch.ID
	}
	ops, err := liveMatchOps(ctx, s.q, ids)
	if err != nil {
		return internal(err)
	}
	out := make([]liveMatchDTO, len(rows))
	for i, row := range rows {
		out[i] = toLiveMatchDTO(row.LiveMatch, row.CreatedByUserID, ops[row.LiveMatch.ID])
	}
	return ok(out)
}

func (s *Server) getLiveMatch(r *request) response {
	ctx := r.Context()
	row, err := s.q.GetLiveMatch(ctx, r.path("id"))
	if notFound(err) || (err == nil && row.LiveMatch.GroupID != r.path("groupId")) {
		return fail(errLiveMatchNotFound)
	}
	if err != nil {
		return internal(err)
	}
	ops, err := liveMatchOps(ctx, s.q, []string{row.LiveMatch.ID})
	if err != nil {
		return internal(err)
	}
	return ok(toLiveMatchDTO(row.LiveMatch, row.CreatedByUserID, ops[row.LiveMatch.ID]))
}

// createLiveMatch creates a live match under the client's id, together with
// its first ops. A repeated call returns what exists, unchanged.
func (s *Server) createLiveMatch(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	seasonID, err := o.str("seasonId")
	if err != nil {
		return springError(400)
	}
	rawOps, present, err := parseLiveOps(o, "ops")
	if err != nil {
		return springError(400)
	}
	groupID, id := r.path("groupId"), r.path("id")
	if !isUUID(id) || seasonID == nil {
		return fail(errLiveMatchInvalidOps)
	}

	ctx := r.Context()
	var created liveMatchDTO
	var isNew bool
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		// a retry of a create that went through (its response got lost) returns what exists
		returnExisting := func() (response, error) {
			row, err := q.GetLiveMatch(ctx, id)
			if err != nil {
				return nil, err
			}
			if row.LiveMatch.GroupID != groupID {
				return fail(errLiveMatchNotFound), nil
			}
			ops, err := liveMatchOps(ctx, q, []string{id})
			if err != nil {
				return nil, err
			}
			created = toLiveMatchDTO(row.LiveMatch, row.CreatedByUserID, ops[id])
			return ok(created), nil
		}
		if _, err := q.GetLiveMatch(ctx, id); err == nil {
			return returnExisting()
		} else if !notFound(err) {
			return nil, err
		}

		_, sn, res := s.activeSeason(ctx, q, groupID, *seasonID)
		if res != nil {
			return res, nil
		}
		memberID, err := s.membershipID(r, q, groupID)
		if err != nil {
			return nil, err
		}
		if memberID == "" {
			return fail(errAuthUserNotInGroup), nil
		}
		ops, valid := normalizeLiveOps(rawOps, present)
		if !valid {
			return fail(errLiveMatchInvalidOps), nil
		}

		now := s.now().Truncate(time.Microsecond)
		inserted, err := q.InsertLiveMatch(ctx, db.InsertLiveMatchParams{ID: id, GroupID: groupID, SeasonID: sn.ID, CreatedBy: memberID, StartedAt: now})
		if err != nil {
			return nil, err
		}
		if inserted == 0 {
			// a concurrent create with the same id won; its transaction is committed by now
			return returnExisting()
		}
		_, failure, err := s.appendLiveMatchOps(ctx, q, id, 0, memberID, ops)
		if err != nil {
			return nil, err
		}
		if failure != nil {
			return failure, nil
		}
		if created, err = loadLiveMatchDTO(ctx, q, id); err != nil {
			return nil, err
		}
		isNew = true
		return ok(created), nil
	})
	if _, isOK := res.(okResponse); isOK && isNew {
		s.hub.Publish(groupID, realtime.LiveMatches, "liveMatchStart", created)
	}
	return res
}

func (s *Server) appendOps(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	rawOps, present, err := parseLiveOps(o, "ops")
	if err != nil {
		return springError(400)
	}
	groupID, id := r.path("groupId"), r.path("id")

	ctx := r.Context()
	var result appended
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		lm, err := q.LockLiveMatch(ctx, db.LockLiveMatchParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return fail(errLiveMatchNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		if lm.LiveMatch.Status != liveInProgress {
			return fail(errLiveMatchEnded), nil
		}
		memberID, err := s.membershipID(r, q, groupID)
		if err != nil {
			return nil, err
		}
		if memberID == "" {
			return fail(errAuthUserNotInGroup), nil
		}
		ops, valid := normalizeLiveOps(rawOps, present)
		if !valid {
			return fail(errLiveMatchInvalidOps), nil
		}
		var failure response
		if result, failure, err = s.appendLiveMatchOps(ctx, q, id, lm.LiveMatch.LastSeq, memberID, ops); err != nil || failure != nil {
			return failure, err
		}
		return ok(liveMatchOpsResultDTO{LastSeq: result.lastSeq, Ops: orEmpty(result.all)}), nil
	})
	if _, isOK := res.(okResponse); isOK && len(result.added) > 0 {
		s.hub.Publish(groupID, realtime.LiveMatches, "liveMatchOps", liveMatchOpsEventDTO{LiveMatchID: id, LastSeq: result.lastSeq, Ops: result.added})
	}
	return res
}

func orEmpty(ops []liveMatchOpDTO) []liveMatchOpDTO {
	if ops == nil {
		return []liveMatchOpDTO{}
	}
	return ops
}
