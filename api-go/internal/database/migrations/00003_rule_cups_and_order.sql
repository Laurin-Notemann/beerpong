-- rule_moves.cups: how many cups a move takes off the table. Rows from
-- before the column are null and resolve by move name (see cupsPerHit).
-- rules.position: the order the rules were written in. Without it the list
-- came back in physical order, which shuffles once Postgres reuses the space
-- of deleted rows. Older rows stay null and sort after positioned ones.

-- +goose Up
ALTER TABLE rule_moves ADD COLUMN IF NOT EXISTS cups integer;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS position integer;

-- +goose Down
ALTER TABLE rules DROP COLUMN IF EXISTS position;
