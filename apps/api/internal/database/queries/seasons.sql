-- Seasons are always read together with their settings. A season without
-- settings is legal in the schema, hence the LEFT JOIN.

-- name: GetSeason :one
SELECT
    s.id, s.name, s.start_date, s.end_date, s.group_id, s.created_by, s.season_settings_id,
    ss.min_matches_to_qualify, ss.min_team_size, ss.max_team_size,
    ss.ranking_algorithm, ss.daily_leaderboard,
    ss.elo_k, ss.elo_kr, ss.elo_ring_weight, ss.elo_swing,
    -- Java's DTO renders a missing wake time as its default "00:00"
    COALESCE(to_char(ss.wake_time, 'HH24:MI:SS'), '00:00')::text AS wake_time
FROM seasons s
LEFT JOIN season_settings ss ON ss.id = s.season_settings_id
WHERE s.id = $1;

-- name: SeasonsByGroup :many
SELECT
    s.id, s.name, s.start_date, s.end_date, s.group_id, s.created_by, s.season_settings_id,
    ss.min_matches_to_qualify, ss.min_team_size, ss.max_team_size,
    ss.ranking_algorithm, ss.daily_leaderboard,
    ss.elo_k, ss.elo_kr, ss.elo_ring_weight, ss.elo_swing,
    -- Java's DTO renders a missing wake time as its default "00:00"
    COALESCE(to_char(ss.wake_time, 'HH24:MI:SS'), '00:00')::text AS wake_time
FROM seasons s
LEFT JOIN season_settings ss ON ss.id = s.season_settings_id
WHERE s.group_id = $1
ORDER BY s.ctid;

-- name: SeasonExistsInGroup :one
SELECT EXISTS (SELECT 1 FROM seasons WHERE id = $1 AND group_id = $2);

-- name: SeasonExists :one
SELECT EXISTS (SELECT 1 FROM seasons WHERE id = $1);

-- name: ActiveSeasonIDOfGroup :one
SELECT id FROM seasons WHERE group_id = $1 AND end_date IS NULL LIMIT 1;

-- name: InsertSeasonSettings :exec
INSERT INTO season_settings (id, daily_leaderboard, max_team_size, min_matches_to_qualify, min_team_size, ranking_algorithm, wake_time,
    elo_k, elo_kr, elo_ring_weight, elo_swing)
VALUES ($1, $2, $3, $4, $5, $6, sqlc.narg(wake_time)::text::time,
    sqlc.narg(elo_k), sqlc.narg(elo_kr), sqlc.narg(elo_ring_weight), sqlc.narg(elo_swing));

-- name: UpdateSeasonSettings :exec
UPDATE season_settings SET
    daily_leaderboard = $2,
    max_team_size = $3,
    min_matches_to_qualify = $4,
    min_team_size = $5,
    ranking_algorithm = $6,
    wake_time = sqlc.narg(wake_time)::text::time,
    elo_k = sqlc.narg(elo_k),
    elo_kr = sqlc.narg(elo_kr),
    elo_ring_weight = sqlc.narg(elo_ring_weight),
    elo_swing = sqlc.narg(elo_swing)
WHERE id = $1;

-- name: InsertSeason :exec
INSERT INTO seasons (id, end_date, group_id, name, start_date, season_settings_id, created_by)
VALUES ($1, NULL, $2, NULL, $3, $4, $5);

-- name: EndSeason :exec
UPDATE seasons SET name = $2, end_date = $3 WHERE id = $1;
