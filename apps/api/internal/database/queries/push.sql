-- name: UpsertPushTokens :exec
INSERT INTO push_tokens (user_id, device_token, activity_start_token, updated_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id) DO UPDATE
SET device_token = EXCLUDED.device_token,
    activity_start_token = EXCLUDED.activity_start_token,
    updated_at = EXCLUDED.updated_at;

-- name: GroupPushTokens :many
-- The tokens of the group's active members' phones.
SELECT pt.user_id, pt.device_token, pt.activity_start_token
FROM push_tokens pt
JOIN group_members gm ON gm.user_id = pt.user_id
WHERE gm.group_id = $1 AND gm.active;

-- name: ForgetDeviceToken :exec
UPDATE push_tokens SET device_token = NULL WHERE user_id = $1 AND device_token = $2;

-- name: ForgetActivityStartToken :exec
UPDATE push_tokens SET activity_start_token = NULL WHERE user_id = $1 AND activity_start_token = $2;

-- name: SetLiveMatchDisplay :exec
UPDATE live_matches SET display = $2, display_seq = $3 WHERE id = $1;

-- name: SetLiveMatchActivityChannel :execrows
-- Only the first channel sticks, so a live match's activities start once.
UPDATE live_matches SET activity_channel = $2 WHERE id = $1 AND activity_channel IS NULL;

-- name: SetLiveMatchActivityEnded :exec
UPDATE live_matches SET activity_ended = true WHERE id = $1;

-- name: UnsentActivityEnds :many
-- Ended live matches whose Live Activities never got their end (a push failed, or the API
-- restarted before it went out), of those started after $1.
SELECT * FROM live_matches
WHERE status <> 'IN_PROGRESS' AND activity_channel IS NOT NULL AND NOT activity_ended AND started_at > $1;
