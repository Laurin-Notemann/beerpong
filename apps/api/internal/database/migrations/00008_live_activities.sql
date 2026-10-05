-- Live scores outside the app: a phone's push tokens, and per live match the
-- score phones report and the APNs channel its Live Activities listen on.

-- +goose Up
CREATE TABLE push_tokens (
    -- a user is one installation of the app
    user_id varchar(255) PRIMARY KEY REFERENCES users (id),
    -- APNs device token; silent pushes to it refresh the home screen widget
    device_token text,
    -- ActivityKit push-to-start token; null while Live Activities are off
    activity_start_token text,
    updated_at timestamp(6) with time zone NOT NULL
);

ALTER TABLE live_matches
    -- JSON of the score as the app shows it: blueNames, blueScore, redNames, redScore
    ADD COLUMN display text,
    -- the last_seq the display was computed at
    ADD COLUMN display_seq bigint,
    -- the APNs broadcast channel of its Live Activities, once they were started
    ADD COLUMN activity_channel text,
    -- the end was broadcast on the channel
    ADD COLUMN activity_ended boolean NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE live_matches
    DROP COLUMN display,
    DROP COLUMN display_seq,
    DROP COLUMN activity_channel,
    DROP COLUMN activity_ended;

DROP TABLE push_tokens;
