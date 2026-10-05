-- name: ProfilesByGroup :many
SELECT * FROM profiles WHERE group_id = $1 ORDER BY ctid;

-- name: GetProfile :one
SELECT * FROM profiles WHERE id = $1;

-- name: ProfileByGroupAndName :one
-- A missing name matches profiles without a name, like Spring Data's
-- derived query did.
SELECT * FROM profiles WHERE group_id = $1 AND name IS NOT DISTINCT FROM sqlc.narg(name)::text
LIMIT 1;

-- name: ProfileExistsInGroup :one
SELECT EXISTS (SELECT 1 FROM profiles WHERE id = $1 AND group_id = $2);

-- name: InsertProfile :one
INSERT INTO profiles (id, name, asset_id_avatar, group_id, created_by)
VALUES ($1, $2, NULL, $3, $4)
RETURNING *;

-- name: UpdateProfileName :one
UPDATE profiles SET name = $2 WHERE id = $1
RETURNING *;

-- name: SetProfileAvatar :one
UPDATE profiles SET asset_id_avatar = $2 WHERE id = $1
RETURNING *;

-- name: InsertProfiles :copyfrom
INSERT INTO profiles (id, name, group_id, created_by) VALUES ($1, $2, $3, $4);

-- name: SetProfileScoreClip :one
UPDATE profiles SET asset_id_score_clip = $2 WHERE id = $1
RETURNING *;
