-- A player's score clip: a short video Versus TV plays when they score in a
-- live match. Stored like the avatar, as an asset of type 3 (PROFILE_SCORE_CLIP).

-- +goose Up
ALTER TABLE profiles ADD COLUMN asset_id_score_clip varchar(255) UNIQUE REFERENCES assets (id);

ALTER TABLE assets DROP CONSTRAINT assets_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_type_check CHECK (type >= 0 AND type <= 3);

-- +goose Down
ALTER TABLE profiles DROP COLUMN asset_id_score_clip;

DELETE FROM assets WHERE type = 3;
ALTER TABLE assets DROP CONSTRAINT assets_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_type_check CHECK (type >= 0 AND type <= 2);
