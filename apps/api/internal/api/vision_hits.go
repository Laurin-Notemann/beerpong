package api

import (
	"context"
	"encoding/json"
	"math"
	"reflect"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

type visionCupDTO struct {
	X int32 `json:"x"`
	Y int32 `json:"y"`
}

type visionImageCupDTO struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Radius float64 `json:"radius"`
}

type visionEvidenceDTO struct {
	ApproachDistance float64 `json:"approachDistance"`
	RimDistance      float64 `json:"rimDistance"`
	Speed            float64 `json:"speed"`
	Observations     int32   `json:"observations"`
	Occluded         bool    `json:"occluded"`
	ExitObserved     bool    `json:"exitObserved"`
}

// Acceptance describes recognition only. These handlers never append score ops.
type visionHitCreateDTO struct {
	LiveMatchID      string            `json:"liveMatchId"`
	ExpectedSeq      *int32            `json:"expectedSeq"`
	CameraID         string            `json:"cameraId"`
	SessionID        string            `json:"sessionId"`
	Model            string            `json:"model"`
	OccurredAt       time.Time         `json:"occurredAt"`
	CameraOccurredAt time.Time         `json:"cameraOccurredAt"`
	Team             string            `json:"team"`
	Cup              *visionCupDTO     `json:"cup"`
	ImageCup         visionImageCupDTO `json:"imageCup"`
	Confidence       float64           `json:"confidence"`
	Evidence         visionEvidenceDTO `json:"evidence"`
}

type visionHitDTO struct {
	visionHitCreateDTO
	ID                string     `json:"id"`
	GroupID           string     `json:"groupId"`
	CreatedAt         time.Time  `json:"createdAt"`
	Revision          int32      `json:"revision"`
	Label             string     `json:"label"`
	FeedbackSource    *string    `json:"feedbackSource"`
	ReviewerModel     *string    `json:"reviewerModel"`
	Reason            *string    `json:"reason"`
	ReviewedAt        *time.Time `json:"reviewedAt"`
	ReplayRequestedAt *time.Time `json:"replayRequestedAt"`
}

type visionHitFeedbackDTO struct {
	ExpectedRevision int32   `json:"expectedRevision"`
	Label            string  `json:"label"`
	Source           string  `json:"source"`
	ReviewerModel    *string `json:"reviewerModel"`
	Reason           *string `json:"reason"`
}

type visionHitReplaySegmentDTO struct {
	ID           string    `json:"id"`
	URL          string    `json:"url"`
	StartedAt    time.Time `json:"startedAt"`
	EndedAt      time.Time `json:"endedAt"`
	StartSeconds float64   `json:"startSeconds"`
	EndSeconds   float64   `json:"endSeconds"`
}

type visionHitReplayDTO struct {
	ID       string                      `json:"id"`
	From     time.Time                   `json:"from"`
	To       time.Time                   `json:"to"`
	Complete bool                        `json:"complete"`
	Segments []visionHitReplaySegmentDTO `json:"segments"`
}

var (
	errVisionHitInvalid  = errorCode{400, "visionHitInvalid", "Invalid hit metadata, feedback or cursor."}
	errVisionHitConflict = errorCode{409, "visionHitConflict", "Hit metadata, camera owner, match sequence or feedback revision conflicts. Refetch before retrying."}
	errVisionHitNotFound = errorCode{404, "visionHitNotFound", "Vision hit not found."}
	errVisionHitRate     = errorCode{429, "visionHitRateLimited", "Camera hit limit or duplicate cooldown reached. Retry later."}
)

// Unlike legacy DTOs, evidence must not silently bind missing fields to zero.
func readVisionBody(r *request, dst any, required ...string) (map[string]any, response) {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return nil, res
	}
	o, valid := body.(map[string]any)
	if !valid || !visionFieldsPresent(o, required...) {
		return nil, fail(errVisionHitInvalid)
	}
	raw, err := json.Marshal(o)
	if err != nil || len(raw) > 8192 {
		return nil, fail(errVisionHitInvalid)
	}
	if err := json.Unmarshal(raw, dst); err != nil {
		return nil, fail(errVisionHitInvalid)
	}
	return o, nil
}

func visionFieldsPresent(o map[string]any, names ...string) bool {
	for _, name := range names {
		if o[name] == nil {
			return false
		}
	}
	return true
}

func visionObjectPresent(o map[string]any, name string, names ...string) bool {
	nested, ok := o[name].(map[string]any)
	return ok && visionFieldsPresent(nested, names...)
}

func visionRange(n, min, max float64) bool {
	return !math.IsNaN(n) && !math.IsInf(n, 0) && n >= min && n <= max
}

func validVisionIdentity(s string, max int) bool {
	if len(s) == 0 || len(s) > max {
		return false
	}
	for _, c := range s {
		if !(c >= 'a' && c <= 'z') && !(c >= 'A' && c <= 'Z') && !(c >= '0' && c <= '9') && !strings.ContainsRune("._:-", c) {
			return false
		}
	}
	return true
}

func readVisionHit(r *request) (visionHitCreateDTO, response) {
	var dto visionHitCreateDTO
	o, res := readVisionBody(r, &dto, "liveMatchId", "cameraId", "sessionId", "model", "occurredAt", "cameraOccurredAt", "team", "imageCup", "confidence", "evidence")
	if res != nil {
		return dto, res
	}
	if !visionObjectPresent(o, "imageCup", "x", "y", "radius") || !visionObjectPresent(o, "evidence", "approachDistance", "rimDistance", "speed", "observations", "occluded", "exitObserved") ||
		(o["cup"] != nil && !visionObjectPresent(o, "cup", "x", "y")) {
		return dto, fail(errVisionHitInvalid)
	}
	if !isUUID(r.path("id")) || !isUUID(dto.LiveMatchID) || !isUUID(dto.SessionID) || !validVisionIdentity(dto.CameraID, 64) || !validVisionIdentity(dto.Model, 128) ||
		(dto.ExpectedSeq != nil && *dto.ExpectedSeq < 0) ||
		(dto.Team != "red" && dto.Team != "blue") || dto.OccurredAt.IsZero() || dto.CameraOccurredAt.IsZero() ||
		!visionRange(dto.Confidence, 0, 1) || !visionRange(dto.ImageCup.X, 0, 1) || !visionRange(dto.ImageCup.Y, 0, 1) || !visionRange(dto.ImageCup.Radius, 0.000001, 0.5) ||
		!visionRange(dto.Evidence.ApproachDistance, 0, 10) || !visionRange(dto.Evidence.RimDistance, 0, 10) || !visionRange(dto.Evidence.Speed, 0, 100) || dto.Evidence.Observations < 1 || dto.Evidence.Observations > 10000 ||
		(dto.Cup != nil && (dto.Cup.X < 0 || dto.Cup.X > 6 || dto.Cup.Y < 0 || dto.Cup.Y > 6)) {
		return dto, fail(errVisionHitInvalid)
	}
	dto.OccurredAt = dto.OccurredAt.UTC().Truncate(time.Microsecond)
	dto.CameraOccurredAt = dto.CameraOccurredAt.UTC().Truncate(time.Microsecond)
	return dto, nil
}

func toVisionHitDTO(row db.VisionHit) (visionHitDTO, error) {
	dto := visionHitDTO{ID: row.ID, GroupID: row.GroupID, CreatedAt: row.CreatedAt, Revision: row.Revision, Label: row.Label,
		FeedbackSource: row.FeedbackSource, ReviewerModel: row.ReviewerModel, Reason: row.Reason, ReviewedAt: row.ReviewedAt,
		ReplayRequestedAt: row.LastReplayRequestedAt}
	err := json.Unmarshal(row.Proposal, &dto.visionHitCreateDTO)
	return dto, err
}

// Both uploads and proposals claim the same camera before writing. Locking this
// row also serializes rate limits and concurrent idempotent proposal retries.
func claimVisionCamera(ctx context.Context, q *db.Queries, groupID, cameraID, sessionID, userID string) (response, error) {
	if err := q.InsertVisionCamera(ctx, db.InsertVisionCameraParams{GroupID: groupID, CameraID: cameraID, CreatedBy: userID}); err != nil {
		return nil, err
	}
	camera, err := q.LockVisionCamera(ctx, db.LockVisionCameraParams{GroupID: groupID, CameraID: cameraID})
	if err != nil {
		return nil, err
	}
	if camera.CreatedBy != userID {
		return fail(errVisionHitConflict), nil
	}
	if err := q.InsertVisionCameraSession(ctx, db.InsertVisionCameraSessionParams{GroupID: groupID, SessionID: sessionID, CameraID: cameraID, CreatedBy: userID}); err != nil {
		return nil, err
	}
	session, err := q.GetVisionCameraSession(ctx, db.GetVisionCameraSessionParams{GroupID: groupID, SessionID: sessionID})
	if err != nil {
		return nil, err
	}
	if session.CameraID != cameraID || session.CreatedBy != userID {
		return fail(errVisionHitConflict), nil
	}
	return nil, nil
}

func visionTimestamp(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }

func (s *Server) putVisionHit(r *request) response {
	dto, res := readVisionHit(r)
	if res != nil {
		return res
	}
	ctx, groupID, id := r.Context(), r.path("groupId"), r.path("id")
	var created *visionHitDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		if res, err := claimVisionCamera(ctx, q, groupID, dto.CameraID, dto.SessionID, r.userID); res != nil || err != nil {
			return res, err
		}
		row, err := q.GetVisionHit(ctx, db.GetVisionHitParams{ID: id, GroupID: groupID})
		if err == nil {
			saved, err := toVisionHitDTO(row)
			if err != nil {
				return nil, err
			}
			if row.CreatedBy != r.userID || !reflect.DeepEqual(saved.visionHitCreateDTO, dto) {
				return fail(errVisionHitConflict), nil
			}
			return ok(saved), nil
		}
		if !notFound(err) {
			return nil, err
		}
		// Freshness and match checks apply only to the first insertion. An exact
		// retry after the match ends must still return the original proposal.
		now := s.now().UTC().Truncate(time.Microsecond)
		if dto.OccurredAt.Before(now.Add(-2*time.Minute)) || dto.OccurredAt.After(now.Add(10*time.Second)) ||
			dto.CameraOccurredAt.Before(dto.OccurredAt.Add(-10*time.Minute)) || dto.CameraOccurredAt.After(dto.OccurredAt.Add(10*time.Minute)) {
			return fail(errVisionHitInvalid), nil
		}
		match, err := q.LockLiveMatch(ctx, db.LockLiveMatchParams{ID: dto.LiveMatchID, GroupID: groupID})
		if notFound(err) {
			return fail(errVisionHitInvalid), nil
		}
		if err != nil {
			return nil, err
		}
		if dto.ExpectedSeq != nil && int64(*dto.ExpectedSeq) != match.LiveMatch.LastSeq {
			return fail(errVisionHitConflict), nil
		}
		if match.LiveMatch.Status != liveInProgress || dto.OccurredAt.Before(match.LiveMatch.StartedAt.Add(-10*time.Second)) {
			return fail(errVisionHitInvalid), nil
		}
		cup, err := json.Marshal(dto.Cup)
		if err != nil {
			return nil, err
		}
		duplicate, err := q.RecentVisionHitDuplicate(ctx, db.RecentVisionHitDuplicateParams{GroupID: groupID, CameraID: dto.CameraID,
			LiveMatchID: dto.LiveMatchID, SessionID: dto.SessionID, EventTime: visionTimestamp(dto.CameraOccurredAt), Team: dto.Team, Cup: cup})
		if err != nil {
			return nil, err
		}
		if duplicate {
			return fail(errVisionHitRate), nil
		}
		n, err := q.ConsumeVisionCameraRate(ctx, db.ConsumeVisionCameraRateParams{GroupID: groupID, CameraID: dto.CameraID, Now: visionTimestamp(now)})
		if err != nil {
			return nil, err
		}
		if n == 0 {
			return fail(errVisionHitRate), nil
		}
		proposal, err := json.Marshal(dto)
		if err != nil {
			return nil, err
		}
		n, err = q.InsertVisionHit(ctx, db.InsertVisionHitParams{ID: id, GroupID: groupID, LiveMatchID: dto.LiveMatchID, CameraID: dto.CameraID,
			SessionID: dto.SessionID, CreatedBy: r.userID, CameraOccurredAt: dto.CameraOccurredAt, Proposal: proposal, CreatedAt: now})
		if err != nil {
			return nil, err
		}
		if n == 0 {
			return fail(errVisionHitConflict), nil
		}
		row, err = q.GetVisionHit(ctx, db.GetVisionHitParams{ID: id, GroupID: groupID})
		if err != nil {
			return nil, err
		}
		saved, err := toVisionHitDTO(row)
		if err != nil {
			return nil, err
		}
		created = &saved
		return ok(saved), nil
	})
	if _, ok := res.(okResponse); ok && created != nil {
		s.hub.Publish(groupID, realtime.VisionHits, "visionHitCreated", *created)
	}
	return res
}

func (s *Server) getVisionHit(r *request) response {
	row, err := s.q.GetVisionHit(r.Context(), db.GetVisionHitParams{ID: r.path("id"), GroupID: r.path("groupId")})
	if notFound(err) {
		return fail(errVisionHitNotFound)
	}
	if err != nil {
		return internal(err)
	}
	dto, err := toVisionHitDTO(row)
	if err != nil {
		return internal(err)
	}
	return ok(dto)
}

// Stable descending pagination: before=<createdAt RFC3339Nano>|<id>. Derive
// the next cursor from the last DTO, preserving timestamp microseconds.
func (s *Server) listVisionHits(r *request) response {
	query := r.URL.Query()
	p := db.ListVisionHitsParams{GroupID: r.path("groupId"), LiveMatchID: query.Get("liveMatchId"), PageLimit: 50,
		ReviewBefore: visionTimestamp(s.now().Add(-30 * time.Second)), BeforeTime: visionTimestamp(time.Unix(0, 0))}
	if p.LiveMatchID != "" && !isUUID(p.LiveMatchID) {
		return fail(errVisionHitInvalid)
	}
	for name, target := range map[string]*bool{"review": &p.Review, "training": &p.Training} {
		if value := query.Get(name); value != "" {
			if value != "true" && value != "false" {
				return fail(errVisionHitInvalid)
			}
			*target = value == "true"
		}
	}
	if p.Review && p.Training {
		return fail(errVisionHitInvalid)
	}
	if value := query.Get("limit"); value != "" {
		n, err := strconv.Atoi(value)
		if err != nil || n < 1 {
			return fail(errVisionHitInvalid)
		}
		p.PageLimit = int32(min(n, 200))
	}
	if value := query.Get("before"); value != "" {
		stamp, id, ok := strings.Cut(value, "|")
		t, err := time.Parse(time.RFC3339Nano, stamp)
		if !ok || err != nil || !isUUID(id) || len(value) > 100 {
			return fail(errVisionHitInvalid)
		}
		p.HasCursor, p.BeforeTime, p.BeforeID = true, visionTimestamp(t), id
	}
	rows, err := s.q.ListVisionHits(r.Context(), p)
	if err != nil {
		return internal(err)
	}
	out := make([]visionHitDTO, len(rows))
	for i, row := range rows {
		if out[i], err = toVisionHitDTO(row); err != nil {
			return internal(err)
		}
	}
	return ok(out)
}

func readVisionFeedback(r *request) (visionHitFeedbackDTO, response) {
	var dto visionHitFeedbackDTO
	_, res := readVisionBody(r, &dto, "expectedRevision", "label", "source")
	if res != nil {
		return dto, res
	}
	if dto.ExpectedRevision < 0 || dto.ExpectedRevision == math.MaxInt32 ||
		(dto.Label != "unreviewed" && dto.Label != "accepted" && dto.Label != "declined" && dto.Label != "uncertain") ||
		(dto.Source != "player" && dto.Source != "human-review" && dto.Source != "ai-review") ||
		(dto.ReviewerModel != nil && !validVisionIdentity(*dto.ReviewerModel, 128)) || (dto.Source == "ai-review" && dto.ReviewerModel == nil) ||
		(dto.Reason != nil && utf8.RuneCountInString(*dto.Reason) > 1000) {
		return dto, fail(errVisionHitInvalid)
	}
	return dto, nil
}

func (s *Server) feedbackVisionHit(r *request) response {
	dto, res := readVisionFeedback(r)
	if res != nil {
		return res
	}
	ctx, id, groupID := r.Context(), r.path("id"), r.path("groupId")
	var changed *visionHitDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		row, err := q.LockVisionHit(ctx, db.LockVisionHitParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return fail(errVisionHitNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		if row.Revision != dto.ExpectedRevision {
			// A lost HTTP response may retry the immediately preceding CAS.
			// Only the same actor and exact feedback count as that retry.
			if row.Revision == dto.ExpectedRevision+1 {
				audit, err := q.GetVisionHitFeedback(ctx, db.GetVisionHitFeedbackParams{HitID: id, Revision: row.Revision})
				if err != nil {
					return nil, err
				}
				if audit.ActorUserID == r.userID && audit.Label == dto.Label && audit.Source == dto.Source && reflect.DeepEqual(audit.ReviewerModel, dto.ReviewerModel) && reflect.DeepEqual(audit.Reason, dto.Reason) {
					saved, err := toVisionHitDTO(row)
					return ok(saved), err
				}
			}
			return fail(errVisionHitConflict), nil
		}
		now := s.now().UTC().Truncate(time.Microsecond)
		row, err = q.SetVisionHitFeedback(ctx, db.SetVisionHitFeedbackParams{ID: id, GroupID: groupID, Revision: dto.ExpectedRevision,
			Label: dto.Label, FeedbackSource: &dto.Source, ReviewerModel: dto.ReviewerModel, Reason: dto.Reason, ReviewedAt: &now})
		if notFound(err) {
			return fail(errVisionHitConflict), nil
		}
		if err != nil {
			return nil, err
		}
		if err := q.AppendVisionHitFeedback(ctx, db.AppendVisionHitFeedbackParams{HitID: id, Revision: row.Revision, ActorUserID: r.userID,
			Label: dto.Label, Source: dto.Source, ReviewerModel: dto.ReviewerModel, Reason: dto.Reason, CreatedAt: now}); err != nil {
			return nil, err
		}
		saved, err := toVisionHitDTO(row)
		if err != nil {
			return nil, err
		}
		changed = &saved
		return ok(saved), nil
	})
	if _, ok := res.(okResponse); ok && changed != nil {
		s.hub.Publish(groupID, realtime.VisionHits, "visionHitFeedback", *changed)
	}
	return res
}

func (s *Server) deleteVisionHit(r *request) response {
	ctx, groupID, id := r.Context(), r.path("groupId"), r.path("id")
	var deleted *db.VisionHit
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		row, err := q.LockVisionHit(ctx, db.LockVisionHitParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return ok("OK"), nil
		}
		if err != nil {
			return nil, err
		}
		if err := q.DeleteVisionHit(ctx, db.DeleteVisionHitParams{ID: id, GroupID: groupID}); err != nil {
			return nil, err
		}
		deleted = &row
		return ok("OK"), nil
	})
	if _, ok := res.(okResponse); ok && deleted != nil {
		s.hub.Publish(groupID, realtime.VisionHits, "visionHitDeleted", struct {
			ID          string `json:"id"`
			LiveMatchID string `json:"liveMatchId"`
		}{id, deleted.LiveMatchID})
	}
	return res
}

func (s *Server) getVisionHitReplay(r *request) response  { return s.visionHitReplay(r, false) }
func (s *Server) postVisionHitReplay(r *request) response { return s.visionHitReplay(r, true) }

func (s *Server) visionHitReplay(r *request, broadcast bool) response {
	ctx, groupID, id := r.Context(), r.path("groupId"), r.path("id")
	var requestedAt time.Time
	var matchID string
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		// Prevent footage deletion and feedback/deletion from interleaving with
		// a replay request. No URLs ever enter a shared realtime payload.
		hit, err := q.LockVisionHit(ctx, db.LockVisionHitParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return fail(errVisionHitNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		dto := visionHitReplayDTO{ID: id, From: hit.CameraOccurredAt.Add(-3 * time.Second), To: hit.CameraOccurredAt.Add(2 * time.Second), Segments: []visionHitReplaySegmentDTO{}}
		rows, err := q.VisionHitReplaySegments(ctx, db.VisionHitReplaySegmentsParams{GroupID: groupID, LiveMatchID: hit.LiveMatchID,
			CameraID: hit.CameraID, SessionID: hit.SessionID, CreatedBy: hit.CreatedBy, FromTime: visionTimestamp(dto.From), ToTime: visionTimestamp(dto.To)})
		if err != nil {
			return nil, err
		}
		covered, gap := dto.From, false
		for _, segment := range rows {
			start, end := segment.StartedAt, segment.EndedAt
			if start.Before(dto.From) {
				start = dto.From
			}
			if start.Before(covered) {
				start = covered
			}
			if end.After(dto.To) {
				end = dto.To
			}
			if !end.After(start) {
				continue
			}
			if start.After(covered) {
				gap = true
			}
			dto.Segments = append(dto.Segments, visionHitReplaySegmentDTO{ID: segment.ID, URL: s.bucket.PublicURL(segment.ObjectKey),
				StartedAt: segment.StartedAt, EndedAt: segment.EndedAt, StartSeconds: start.Sub(segment.StartedAt).Seconds(), EndSeconds: end.Sub(segment.StartedAt).Seconds()})
			covered = end
		}
		dto.Complete = !gap && !covered.Before(dto.To)
		if broadcast && dto.Complete {
			now := s.now().UTC().Truncate(time.Microsecond)
			n, err := q.RequestVisionHitReplay(ctx, db.RequestVisionHitReplayParams{ID: id, GroupID: groupID, Now: visionTimestamp(now)})
			if err != nil {
				return nil, err
			}
			if n == 0 {
				return fail(errVisionHitRate), nil
			}
			requestedAt, matchID = now, hit.LiveMatchID
		}
		return ok(dto), nil
	})
	if _, ok := res.(okResponse); ok && !requestedAt.IsZero() {
		s.hub.Publish(groupID, realtime.VisionHits, "visionHitReplay", struct {
			ID          string    `json:"id"`
			LiveMatchID string    `json:"liveMatchId"`
			RequestedAt time.Time `json:"requestedAt"`
		}{id, matchID, requestedAt})
	}
	return res
}
