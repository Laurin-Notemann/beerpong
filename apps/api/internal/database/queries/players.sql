-- name: InsertStatistics :copyfrom
INSERT INTO statistics (id, points, matches, wins, moves, total_team_size, avg_points_per_match, avg_team_size, elo)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- name: InsertPlayers :copyfrom
INSERT INTO players (id, active_this_season, profile_id, season_id, statistics_id)
VALUES ($1, $2, $3, $4, $5);

-- name: PlayersInSeason :many
SELECT * FROM players
WHERE season_id = $1 AND (active_this_season OR @include_inactive::boolean)
ORDER BY ctid;

-- name: PlayerIDsInSeason :many
SELECT id FROM players
WHERE season_id = $1 AND (active_this_season OR @include_inactive::boolean)
ORDER BY ctid;

-- name: GetPlayerWithSeason :one
SELECT sqlc.embed(p), s.group_id AS season_group_id, s.end_date AS season_end_date
FROM players p
LEFT JOIN seasons s ON s.id = p.season_id
WHERE p.id = $1;

-- name: SetPlayerActive :exec
UPDATE players SET active_this_season = $2 WHERE id = $1;

-- name: PlayerIDByProfileAndSeason :one
SELECT id FROM players WHERE profile_id = $1 AND season_id = $2 LIMIT 1;

-- name: LatestPlayerOfProfile :one
SELECT
    p.id, p.season_id,
    st.points, st.matches, st.wins, st.moves, st.total_team_size,
    st.avg_points_per_match, st.avg_team_size, st.elo
FROM players p
JOIN seasons s ON s.id = p.season_id
LEFT JOIN statistics st ON st.id = p.statistics_id
WHERE p.profile_id = $1
ORDER BY s.start_date DESC
LIMIT 1;

-- name: PlayersWithStatsInSeason :many
SELECT
    p.id, p.profile_id, p.active_this_season,
    st.points, st.matches, st.wins, st.moves, st.total_team_size,
    st.avg_points_per_match, st.avg_team_size, st.elo,
    s.id AS season_id, s.name AS season_name, s.start_date AS season_start_date, s.end_date AS season_end_date,
    ss.min_matches_to_qualify, ss.min_team_size, ss.max_team_size,
    ss.ranking_algorithm, ss.daily_leaderboard,
    ss.elo_k, ss.elo_kr, ss.elo_ring_weight, ss.elo_swing, ss.elo_spread,
    -- Java's DTO renders a missing wake time as its default "00:00"
    COALESCE(to_char(ss.wake_time, 'HH24:MI:SS'), '00:00')::text AS wake_time
FROM players p
JOIN statistics st ON st.id = p.statistics_id
JOIN seasons s ON s.id = p.season_id
LEFT JOIN season_settings ss ON ss.id = s.season_settings_id
WHERE p.season_id = $1
  AND (sqlc.narg(player_ids)::text[] IS NULL OR p.id = ANY (sqlc.narg(player_ids)::text[]))
ORDER BY p.ctid;

-- name: PlayersWithStatsInGroup :many
-- PlayersWithStatsInSeason for every season of a group.
SELECT
    p.id, p.profile_id, p.active_this_season,
    st.points, st.matches, st.wins, st.moves, st.total_team_size,
    st.avg_points_per_match, st.avg_team_size, st.elo,
    s.id AS season_id, s.name AS season_name, s.start_date AS season_start_date, s.end_date AS season_end_date,
    ss.min_matches_to_qualify, ss.min_team_size, ss.max_team_size,
    ss.ranking_algorithm, ss.daily_leaderboard,
    ss.elo_k, ss.elo_kr, ss.elo_ring_weight, ss.elo_swing, ss.elo_spread,
    COALESCE(to_char(ss.wake_time, 'HH24:MI:SS'), '00:00')::text AS wake_time
FROM players p
JOIN statistics st ON st.id = p.statistics_id
JOIN seasons s ON s.id = p.season_id
LEFT JOIN season_settings ss ON ss.id = s.season_settings_id
WHERE s.group_id = $1
ORDER BY p.ctid;

-- name: ProfileIDsOfPlayers :many
SELECT id, profile_id FROM players WHERE id = ANY (@ids::text[]);

-- name: ExistingPlayersInSeason :one
SELECT count(*) FROM players WHERE id = ANY (@ids::text[]) AND season_id = $1;

-- name: ExistingPlayerIDs :many
SELECT id FROM players WHERE id = ANY (@ids::text[]);
