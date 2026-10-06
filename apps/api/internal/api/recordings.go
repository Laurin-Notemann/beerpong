package api

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
)

const maxRecordingBytes = 32 << 20

// Camera clocks supply these UTC times, like the phone's cup-hit timestamps.
// Each file is a standalone recorder run, not a slice of a longer WebM/MP4.
type cameraRecordingCreateDTO struct {
	CameraID     string    `json:"cameraId"`
	CameraName   string    `json:"cameraName"`
	SessionID    string    `json:"sessionId"`
	SegmentIndex int32     `json:"segmentIndex"`
	StartedAt    time.Time `json:"startedAt"`
	EndedAt      time.Time `json:"endedAt"`
	ContentType  string    `json:"contentType"`
	SizeBytes    int64     `json:"sizeBytes"`
	LiveMatchIDs []string  `json:"liveMatchIds"`
}

type cameraRecordingUploadDTO struct {
	ID              string `json:"id"`
	ObjectKey       string `json:"objectKey"`
	SingleUploadURL string `json:"singleUploadUrl"`
}

var (
	errRecordingInvalid  = errorCode{400, "cameraRecordingInvalid", "Invalid recording metadata or live matches."}
	errRecordingConflict = errorCode{409, "cameraRecordingConflict", "This segment already exists with different metadata."}
	errRecordingNotFound = errorCode{404, "cameraRecordingNotFound", "Recording not found."}
)

// putCameraRecording reserves a key idempotently. A retry must carry the same
// metadata; the URL is fresh each time. Ended matches remain valid for queued uploads.
func (s *Server) putCameraRecording(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return springError(400)
	}
	var dto cameraRecordingCreateDTO
	if err := json.Unmarshal(raw, &dto); err != nil {
		return fail(errRecordingInvalid)
	}
	id, groupID := r.path("id"), r.path("groupId")
	duration := dto.EndedAt.Sub(dto.StartedAt)
	if !isUUID(id) || !isUUID(dto.SessionID) || strings.TrimSpace(dto.CameraID) == "" || len(dto.CameraID) > 64 ||
		strings.TrimSpace(dto.CameraName) == "" || utf8.RuneCountInString(dto.CameraName) > 200 ||
		dto.SegmentIndex < 0 || dto.StartedAt.IsZero() || duration <= 0 || duration > 5*time.Minute ||
		(dto.ContentType != "video/mp4" && dto.ContentType != "video/webm") || dto.SizeBytes <= 0 || dto.SizeBytes > maxRecordingBytes ||
		len(dto.LiveMatchIDs) == 0 || len(dto.LiveMatchIDs) > 20 {
		return fail(errRecordingInvalid)
	}
	dto.StartedAt = dto.StartedAt.Truncate(time.Microsecond)
	dto.EndedAt = dto.EndedAt.Truncate(time.Microsecond)
	if !dto.EndedAt.After(dto.StartedAt) {
		return fail(errRecordingInvalid)
	}
	slices.Sort(dto.LiveMatchIDs)
	for i, matchID := range dto.LiveMatchIDs {
		if !isUUID(matchID) || (i > 0 && matchID == dto.LiveMatchIDs[i-1]) {
			return fail(errRecordingInvalid)
		}
	}
	ext := "webm"
	if dto.ContentType == "video/mp4" {
		ext = "mp4"
	}
	key := fmt.Sprintf("recordings/%s/%s/%06d-%s.%s", groupID, dto.SessionID, dto.SegmentIndex, id, ext)
	ctx := r.Context()
	return s.tx(ctx, func(q *db.Queries) (response, error) {
		n, err := q.InsertCameraRecording(ctx, db.InsertCameraRecordingParams{
			ID: id, GroupID: groupID, CreatedBy: r.userID, CameraID: dto.CameraID, CameraName: dto.CameraName,
			SessionID: dto.SessionID, SegmentIndex: dto.SegmentIndex, StartedAt: dto.StartedAt, EndedAt: dto.EndedAt,
			ContentType: dto.ContentType, SizeBytes: dto.SizeBytes, ObjectKey: key, CreatedAt: s.now(),
		})
		if err != nil {
			return nil, err
		}
		if n > 0 {
			linked, err := q.LinkCameraRecordingMatches(ctx, db.LinkCameraRecordingMatchesParams{RecordingID: id, GroupID: groupID, LiveMatchIds: dto.LiveMatchIDs})
			if err != nil {
				return nil, err
			}
			if linked != int64(len(dto.LiveMatchIDs)) {
				return fail(errRecordingInvalid), nil
			}
		}
		row, err := q.GetCameraRecording(ctx, db.GetCameraRecordingParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return fail(errRecordingConflict), nil
		}
		if err != nil {
			return nil, err
		}
		ids, err := q.CameraRecordingMatchIDs(ctx, id)
		if err != nil {
			return nil, err
		}
		if row.CreatedBy != r.userID || row.CameraID != dto.CameraID || row.CameraName != dto.CameraName || row.SessionID != dto.SessionID ||
			row.SegmentIndex != dto.SegmentIndex || !row.StartedAt.Equal(dto.StartedAt) || !row.EndedAt.Equal(dto.EndedAt) ||
			row.ContentType != dto.ContentType || row.SizeBytes != dto.SizeBytes || !slices.Equal(ids, dto.LiveMatchIDs) {
			return fail(errRecordingConflict), nil
		}
		url, err := s.bucket.UploadURL(ctx, row.ObjectKey)
		if err != nil {
			return nil, err
		}
		return ok(cameraRecordingUploadDTO{ID: id, ObjectKey: row.ObjectKey, SingleUploadURL: url}), nil
	})
}

// The uploader acknowledges a successful bucket PUT. Consumers use uploaded_at
// to exclude reservations whose upload failed; retries may acknowledge twice.
func (s *Server) completeCameraRecording(r *request) response {
	n, err := s.q.CompleteCameraRecording(r.Context(), db.CompleteCameraRecordingParams{
		ID: r.path("id"), GroupID: r.path("groupId"), CreatedBy: r.userID, UploadedAt: ptr(s.now()),
	})
	if err != nil {
		return internal(err)
	}
	if n == 0 {
		return fail(errRecordingNotFound)
	}
	return ok("OK")
}

// Any group member can remove footage, including files whose upload failed.
func (s *Server) deleteCameraRecording(r *request) response {
	ctx := r.Context()
	return s.tx(ctx, func(q *db.Queries) (response, error) {
		row, err := q.GetCameraRecording(ctx, db.GetCameraRecordingParams{ID: r.path("id"), GroupID: r.path("groupId")})
		if notFound(err) {
			return ok("OK"), nil
		}
		if err != nil {
			return nil, err
		}
		if err := s.bucket.Delete(ctx, row.ObjectKey); err != nil {
			return nil, err
		}
		if err := q.DeleteCameraRecording(ctx, db.DeleteCameraRecordingParams{ID: row.ID, GroupID: row.GroupID}); err != nil {
			return nil, err
		}
		return ok("OK"), nil
	})
}
