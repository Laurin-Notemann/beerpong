-- A season's Elo weights (leaderboard.EloParams), edited in the season
-- settings. NULL is the leaderboard's default (DefaultElo).

-- +goose Up
ALTER TABLE season_settings
    ADD COLUMN elo_k double precision,
    ADD COLUMN elo_kr double precision,
    ADD COLUMN elo_ring_weight double precision,
    ADD COLUMN elo_swing double precision;

-- +goose Down
ALTER TABLE season_settings
    DROP COLUMN elo_k,
    DROP COLUMN elo_kr,
    DROP COLUMN elo_ring_weight,
    DROP COLUMN elo_swing;
