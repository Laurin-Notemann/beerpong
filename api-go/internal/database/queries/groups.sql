-- name: GetGroup :one
SELECT * FROM groups WHERE id = $1;

-- name: GetGroupByInviteCode :one
SELECT * FROM groups WHERE invite_code = $1 LIMIT 1;

-- name: GroupExists :one
SELECT EXISTS (SELECT 1 FROM groups WHERE id = $1);

-- name: UserGroupsWithStats :many
-- Groups the user hasn't left (leaving deactivates the membership), with
-- counters for the active season.
SELECT
    sqlc.embed(g),
    (SELECT count(*) FROM matches m WHERE m.season_id = g.active_season_id) AS matches,
    (SELECT count(*) FROM players p WHERE p.season_id = g.active_season_id) AS players,
    (SELECT count(*) FROM seasons s WHERE s.group_id = g.id) AS seasons
FROM groups g
WHERE g.id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = $1 AND gm.active)
ORDER BY g.ctid;

-- name: GroupWithStats :one
SELECT
    sqlc.embed(g),
    (SELECT count(*) FROM matches m WHERE m.season_id = g.active_season_id) AS matches,
    (SELECT count(*) FROM players p WHERE p.season_id = g.active_season_id) AS players,
    (SELECT count(*) FROM seasons s WHERE s.group_id = g.id) AS seasons
FROM groups g
WHERE g.id = $1;

-- name: InsertGroup :exec
INSERT INTO groups (id, created_at, custom_sport_name, invite_code, name, sport_preset, active_season_id, asset_id_wallpaper, created_by)
VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL);

-- name: FinishGroupCreation :one
UPDATE groups SET active_season_id = $2, created_by = $3 WHERE id = $1
RETURNING *;

-- name: UpdateGroupName :one
UPDATE groups SET name = $2 WHERE id = $1
RETURNING *;

-- name: SetGroupWallpaper :one
UPDATE groups SET asset_id_wallpaper = $2 WHERE id = $1
RETURNING *;

-- name: SetGroupActiveSeason :exec
UPDATE groups SET active_season_id = $2 WHERE id = $1;
