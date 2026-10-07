-- +goose Up
CREATE TABLE tournaments (
    id text PRIMARY KEY,
    group_id text NOT NULL REFERENCES groups (id),
    season_id text NOT NULL REFERENCES seasons (id),
    status text NOT NULL CHECK (status IN ('ACTIVE', 'FINISHED', 'CANCELLED')),
    created_at timestamp(6) with time zone NOT NULL,
    data jsonb NOT NULL
);
CREATE UNIQUE INDEX tournaments_one_active_per_group ON tournaments (group_id) WHERE status = 'ACTIVE';
CREATE INDEX tournaments_group_idx ON tournaments (group_id, created_at DESC);
ALTER TABLE live_matches ADD COLUMN tournament_id text REFERENCES tournaments (id);
ALTER TABLE live_matches ADD COLUMN tournament_stage text;
ALTER TABLE matches ADD COLUMN tournament_id text REFERENCES tournaments (id);
ALTER TABLE matches ADD COLUMN tournament_stage text;

-- +goose Down
ALTER TABLE matches DROP COLUMN tournament_stage, DROP COLUMN tournament_id;
ALTER TABLE live_matches DROP COLUMN tournament_stage, DROP COLUMN tournament_id;
DROP TABLE tournaments;
