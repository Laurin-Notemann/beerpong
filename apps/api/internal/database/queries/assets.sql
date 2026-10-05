-- name: InsertAsset :one
INSERT INTO assets (id, offsetx, offsety, type, zoom) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetAsset :one
SELECT * FROM assets WHERE id = $1;

-- name: DeleteAsset :exec
DELETE FROM assets WHERE id = $1;
