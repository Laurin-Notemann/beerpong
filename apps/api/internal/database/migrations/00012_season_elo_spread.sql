-- A season's Elo spread (leaderboard.EloParams.Spread). NULL is the default.

-- +goose Up
ALTER TABLE season_settings ADD COLUMN elo_spread double precision;

-- +goose Down
ALTER TABLE season_settings DROP COLUMN elo_spread;
