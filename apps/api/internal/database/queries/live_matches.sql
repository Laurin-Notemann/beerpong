-- name: InsertLiveMatch :execrows
INSERT INTO live_matches (id, group_id, season_id, created_by, status, started_at, last_activity_at, last_seq)
VALUES ($1, $2, $3, $4, 'IN_PROGRESS', $5, $5, 0)
ON CONFLICT (id) DO NOTHING;

-- name: GetLiveMatch :one
SELECT sqlc.embed(lm), gm.user_id AS created_by_user_id
FROM live_matches lm
JOIN group_members gm ON gm.id = lm.created_by
WHERE lm.id = $1;

-- name: LockLiveMatch :one
-- Every write to a live match runs in a transaction that first takes this lock,
-- so seq is assigned one request at a time.
SELECT sqlc.embed(lm), gm.user_id AS created_by_user_id
FROM live_matches lm
JOIN group_members gm ON gm.id = lm.created_by
WHERE lm.id = $1 AND lm.group_id = $2
FOR UPDATE OF lm;

-- name: InProgressLiveMatchesByGroup :many
SELECT sqlc.embed(lm), gm.user_id AS created_by_user_id
FROM live_matches lm
JOIN group_members gm ON gm.id = lm.created_by
WHERE lm.group_id = $1 AND lm.status = 'IN_PROGRESS'
ORDER BY lm.last_activity_at DESC, lm.started_at DESC, lm.id;

-- name: FinishedLiveMatchesBySeason :many
-- the season's live matches that became a match, oldest first: the Elo
-- simulator replays their ops
SELECT sqlc.embed(lm), gm.user_id AS created_by_user_id
FROM live_matches lm
JOIN group_members gm ON gm.id = lm.created_by
JOIN matches m ON m.id = lm.result_match_id
WHERE lm.group_id = $1 AND lm.season_id = $2 AND lm.status = 'FINISHED'
ORDER BY lm.started_at, lm.id;

-- name: SetLiveMatchProgress :exec
UPDATE live_matches SET last_seq = $2, last_activity_at = $3 WHERE id = $1;

-- name: InsertLiveMatchOp :execrows
INSERT INTO live_match_ops (id, live_match_id, seq, created_at, created_by, type, payload)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (id) DO NOTHING;

-- name: LiveMatchOpsByIDs :many
SELECT * FROM live_match_ops WHERE id = ANY (@ids::text[]);

-- name: LiveMatchOpsByLiveMatchIDs :many
SELECT * FROM live_match_ops WHERE live_match_id = ANY (@live_match_ids::text[]) ORDER BY live_match_id, seq;

-- name: EndLiveMatch :exec
UPDATE live_matches SET status = $2, ended_at = $3, result_match_id = $4 WHERE id = $1;

-- name: StaleLiveMatches :many
-- Candidates for expiry. The caller locks and re-reads each one before it decides.
SELECT id, group_id FROM live_matches WHERE status = 'IN_PROGRESS' AND last_activity_at < $1;
