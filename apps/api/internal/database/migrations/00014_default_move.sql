-- rule_moves.default_move: the move a pro mode quick hit (holding a cup and
-- dragging to the scorer) counts as. At most one per season, never a finish.

-- +goose Up
ALTER TABLE rule_moves ADD COLUMN default_move boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX rule_moves_one_default_per_season ON rule_moves (season_id) WHERE default_move;

-- +goose Down
DROP INDEX rule_moves_one_default_per_season;
ALTER TABLE rule_moves DROP COLUMN default_move;
