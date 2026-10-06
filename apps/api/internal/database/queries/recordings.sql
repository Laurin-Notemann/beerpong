-- name: InsertCameraRecording :execrows
INSERT INTO camera_recordings (id, group_id, created_by, camera_id, camera_name, session_id, segment_index, started_at, ended_at, content_type, size_bytes, object_key, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
ON CONFLICT DO NOTHING;

-- name: GetCameraRecording :one
SELECT * FROM camera_recordings WHERE id = $1 AND group_id = $2 FOR UPDATE;

-- name: CameraRecordingMatchIDs :many
SELECT live_match_id FROM camera_recording_matches WHERE recording_id = $1 ORDER BY live_match_id;

-- name: LinkCameraRecordingMatches :execrows
INSERT INTO camera_recording_matches (recording_id, live_match_id, season_id)
SELECT sqlc.arg(recording_id)::text, id, season_id FROM live_matches
WHERE group_id = sqlc.arg(group_id)::text AND id = ANY (sqlc.arg(live_match_ids)::text[]);

-- name: CompleteCameraRecording :execrows
UPDATE camera_recordings SET uploaded_at = COALESCE(uploaded_at, sqlc.arg(uploaded_at))
WHERE id = $1 AND group_id = $2 AND created_by = $3;

-- name: DeleteCameraRecording :exec
DELETE FROM camera_recordings WHERE id = $1 AND group_id = $2;
