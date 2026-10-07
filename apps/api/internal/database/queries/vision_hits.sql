-- name: InsertVisionCamera :exec
INSERT INTO vision_cameras (group_id, camera_id, created_by) VALUES ($1, $2, $3)
ON CONFLICT DO NOTHING;

-- name: InsertVisionCameraSession :exec
INSERT INTO vision_camera_sessions (group_id, session_id, camera_id, created_by) VALUES ($1, $2, $3, $4)
ON CONFLICT DO NOTHING;

-- name: GetVisionCameraSession :one
SELECT * FROM vision_camera_sessions WHERE group_id = $1 AND session_id = $2;

-- name: LockVisionCamera :one
SELECT * FROM vision_cameras WHERE group_id = $1 AND camera_id = $2 FOR UPDATE;

-- name: ConsumeVisionCameraRate :execrows
UPDATE vision_cameras
SET rate_window = CASE WHEN rate_window <= sqlc.arg(now)::timestamptz - interval '1 minute' THEN sqlc.arg(now)::timestamptz ELSE rate_window END,
    rate_count = CASE WHEN rate_window <= sqlc.arg(now)::timestamptz - interval '1 minute' THEN 1 ELSE rate_count + 1 END,
    last_hit_at = sqlc.arg(now)::timestamptz
WHERE group_id = $1 AND camera_id = $2
AND last_hit_at <= sqlc.arg(now)::timestamptz - interval '250 milliseconds'
AND (rate_window <= sqlc.arg(now)::timestamptz - interval '1 minute' OR rate_count < 60);

-- name: InsertVisionHit :execrows
INSERT INTO vision_hits (id, group_id, live_match_id, camera_id, session_id, created_by, camera_occurred_at, proposal, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING;

-- name: GetVisionHit :one
SELECT * FROM vision_hits WHERE id = $1 AND group_id = $2;

-- name: LockVisionHit :one
SELECT * FROM vision_hits WHERE id = $1 AND group_id = $2 FOR UPDATE;

-- name: ListVisionHits :many
SELECT * FROM vision_hits
WHERE group_id = sqlc.arg(group_id)::text
AND (sqlc.arg(live_match_id)::text = '' OR live_match_id = sqlc.arg(live_match_id)::text)
AND (NOT sqlc.arg(review)::boolean OR label = 'uncertain' OR (label = 'unreviewed' AND created_at < sqlc.arg(review_before)::timestamptz))
AND (NOT sqlc.arg(training)::boolean OR label IN ('accepted', 'declined'))
AND (NOT sqlc.arg(has_cursor)::boolean OR (created_at, id) < (sqlc.arg(before_time)::timestamptz, sqlc.arg(before_id)::text))
ORDER BY created_at DESC, id DESC LIMIT sqlc.arg(page_limit)::integer;

-- name: RecentVisionHitDuplicate :one
SELECT EXISTS (SELECT 1 FROM vision_hits
WHERE group_id = $1 AND camera_id = $2 AND live_match_id = $3 AND session_id = $4
AND camera_occurred_at BETWEEN sqlc.arg(event_time)::timestamptz - interval '2 seconds' AND sqlc.arg(event_time)::timestamptz + interval '2 seconds'
AND proposal->>'team' = sqlc.arg(team)::text AND proposal->'cup' = sqlc.arg(cup)::jsonb);

-- name: SetVisionHitFeedback :one
UPDATE vision_hits SET revision = revision + 1, label = $4, feedback_source = $5,
reviewer_model = sqlc.narg(reviewer_model), reason = sqlc.narg(reason), reviewed_at = sqlc.arg(reviewed_at)
WHERE id = $1 AND group_id = $2 AND revision = $3 RETURNING *;

-- name: AppendVisionHitFeedback :exec
INSERT INTO vision_hit_feedback (hit_id, revision, actor_user_id, label, source, reviewer_model, reason, created_at)
VALUES (sqlc.arg(hit_id), sqlc.arg(revision), sqlc.arg(actor_user_id), sqlc.arg(label), sqlc.arg(source), sqlc.narg(reviewer_model), sqlc.narg(reason), sqlc.arg(created_at));

-- name: GetVisionHitFeedback :one
SELECT * FROM vision_hit_feedback WHERE hit_id = $1 AND revision = $2;

-- name: DeleteVisionHit :exec
DELETE FROM vision_hits WHERE id = $1 AND group_id = $2;

-- name: VisionHitReplaySegments :many
SELECT cr.* FROM camera_recordings cr
JOIN camera_recording_matches crm ON crm.recording_id = cr.id
WHERE cr.group_id = $1 AND crm.live_match_id = $2 AND cr.camera_id = $3 AND cr.session_id = $4
AND cr.created_by = $5 AND cr.uploaded_at IS NOT NULL
AND cr.started_at < sqlc.arg(to_time)::timestamptz AND cr.ended_at > sqlc.arg(from_time)::timestamptz
ORDER BY cr.started_at, cr.ended_at, cr.id LIMIT 64 FOR SHARE OF cr;

-- name: RequestVisionHitReplay :execrows
UPDATE vision_hits SET last_replay_requested_at = sqlc.arg(now)::timestamptz
WHERE id = $1 AND group_id = $2
AND (last_replay_requested_at IS NULL OR last_replay_requested_at <= sqlc.arg(now)::timestamptz - interval '5 seconds');
