-- +goose Up
CREATE TABLE camera_recordings (
    id text PRIMARY KEY,
    group_id text NOT NULL REFERENCES groups (id),
    created_by text NOT NULL REFERENCES users (id),
    camera_id text NOT NULL,
    camera_name text NOT NULL,
    session_id text NOT NULL,
    segment_index integer NOT NULL CHECK (segment_index >= 0),
    started_at timestamp(6) with time zone NOT NULL,
    ended_at timestamp(6) with time zone NOT NULL CHECK (ended_at > started_at),
    content_type text NOT NULL CHECK (content_type IN ('video/mp4', 'video/webm')),
    size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 33554432),
    object_key text NOT NULL UNIQUE,
    created_at timestamp(6) with time zone NOT NULL,
    -- Only set after the upload succeeds; pending rows are not training footage.
    uploaded_at timestamp(6) with time zone,
    UNIQUE (camera_id, session_id, segment_index)
);
CREATE INDEX camera_recordings_group_started_idx ON camera_recordings (group_id, started_at);

-- A camera films once even when several matches run at the table. Keep each
-- season here; the eventual finished match is live_matches.result_match_id.
CREATE TABLE camera_recording_matches (
    recording_id text NOT NULL REFERENCES camera_recordings (id) ON DELETE CASCADE,
    live_match_id text NOT NULL REFERENCES live_matches (id),
    season_id text NOT NULL REFERENCES seasons (id),
    PRIMARY KEY (recording_id, live_match_id)
);
CREATE INDEX camera_recording_matches_live_idx ON camera_recording_matches (live_match_id);

-- +goose Down
DROP TABLE camera_recording_matches;
DROP TABLE camera_recordings;
