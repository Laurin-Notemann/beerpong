-- A player can have several score clips; Versus TV and the app play a random one
-- when they score. Kept as an array on the profile (oldest first), like the
-- single clip before it, so listing profiles stays one query.

-- +goose Up
ALTER TABLE profiles ADD COLUMN asset_ids_score_clips varchar(255)[] NOT NULL DEFAULT '{}';
UPDATE profiles SET asset_ids_score_clips = ARRAY[asset_id_score_clip]
WHERE asset_id_score_clip IS NOT NULL;
ALTER TABLE profiles DROP COLUMN asset_id_score_clip;

-- +goose Down
ALTER TABLE profiles ADD COLUMN asset_id_score_clip varchar(255) UNIQUE REFERENCES assets (id);
UPDATE profiles SET asset_id_score_clip = asset_ids_score_clips[cardinality(asset_ids_score_clips)]
WHERE cardinality(asset_ids_score_clips) > 0;
ALTER TABLE profiles DROP COLUMN asset_ids_score_clips;
