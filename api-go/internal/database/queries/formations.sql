-- name: FormationsByGroup :many
SELECT * FROM formations
WHERE group_id = $1
ORDER BY created_at, id;

-- name: UpsertFormation :one
-- A formation's id comes from the app, so a retried create is an update. A
-- formation never moves to another group: then no row is returned.
INSERT INTO formations (id, group_id, name, cups, created_by, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $6)
ON CONFLICT (id) DO UPDATE SET name = excluded.name, cups = excluded.cups, updated_at = excluded.updated_at
WHERE formations.group_id = excluded.group_id
RETURNING *;

-- name: DeleteFormation :execrows
DELETE FROM formations WHERE id = $1 AND group_id = $2;
