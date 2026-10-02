-- name: RulesBySeason :many
SELECT * FROM rules WHERE season_id = $1 ORDER BY ctid;

-- name: DeleteRulesBySeason :exec
DELETE FROM rules WHERE season_id = $1;

-- name: InsertRules :copyfrom
INSERT INTO rules (id, title, description, season_id, created_by) VALUES ($1, $2, $3, $4, $5);

-- name: CopyRules :exec
INSERT INTO rules (id, title, description, season_id, created_by)
SELECT gen_random_uuid()::text, r.title, r.description, @new_season_id, r.created_by
FROM rules r
WHERE r.season_id = @old_season_id;

-- name: RuleMovesBySeason :many
SELECT * FROM rule_moves WHERE season_id = $1 ORDER BY ctid;

-- name: GetRuleMove :one
SELECT * FROM rule_moves WHERE id = $1;

-- name: RuleMovesByIDs :many
SELECT * FROM rule_moves WHERE id = ANY (@ids::text[]);

-- name: InsertRuleMove :one
INSERT INTO rule_moves (id, finishing_move, name, points_for_scorer, points_for_team, season_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: InsertRuleMoves :copyfrom
INSERT INTO rule_moves (id, finishing_move, name, points_for_scorer, points_for_team, season_id)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: UpdateRuleMove :one
UPDATE rule_moves SET name = $2, points_for_team = $3, points_for_scorer = $4, finishing_move = $5
WHERE id = $1
RETURNING *;

-- name: RuleMoveExistsInSeason :one
SELECT EXISTS (SELECT 1 FROM rule_moves WHERE id = $1 AND season_id = $2);

-- name: FinishingMoveIDs :many
SELECT id FROM rule_moves WHERE id = ANY (@ids::text[]) AND finishing_move;

-- name: CountRuleMovesInSeason :one
SELECT count(*) FROM rule_moves WHERE id = ANY (@ids::text[]) AND season_id = $1;
