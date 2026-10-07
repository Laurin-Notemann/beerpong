-- +goose Up
-- Camera ownership survives footage and suggestion deletion.
CREATE TABLE vision_cameras (
    group_id text NOT NULL REFERENCES groups (id),
    camera_id text NOT NULL,
    created_by text NOT NULL REFERENCES users (id),
    rate_window timestamp(6) with time zone NOT NULL DEFAULT '1970-01-01T00:00:00Z',
    rate_count integer NOT NULL DEFAULT 0,
    last_hit_at timestamp(6) with time zone NOT NULL DEFAULT '1970-01-01T00:00:00Z',
    PRIMARY KEY (group_id, camera_id)
);
INSERT INTO vision_cameras (group_id, camera_id, created_by)
SELECT DISTINCT ON (group_id, camera_id) group_id, camera_id, created_by
FROM camera_recordings ORDER BY group_id, camera_id, created_at, id;

-- Recorder sessions can be claimed before the first 30-second upload arrives.
-- The same session ID cannot later be reused by a different camera or creator.
CREATE TABLE vision_camera_sessions (
    group_id text NOT NULL REFERENCES groups (id),
    session_id text NOT NULL,
    camera_id text NOT NULL,
    created_by text NOT NULL REFERENCES users (id),
    PRIMARY KEY (group_id, session_id),
    FOREIGN KEY (group_id, camera_id) REFERENCES vision_cameras (group_id, camera_id)
);
INSERT INTO vision_camera_sessions (group_id, session_id, camera_id, created_by)
SELECT DISTINCT ON (group_id, session_id) group_id, session_id, camera_id, created_by
FROM camera_recordings ORDER BY group_id, session_id, created_at, id;

CREATE TABLE vision_hits (
    id text PRIMARY KEY,
    group_id text NOT NULL REFERENCES groups (id),
    live_match_id text NOT NULL REFERENCES live_matches (id),
    camera_id text NOT NULL,
    session_id text NOT NULL,
    created_by text NOT NULL REFERENCES users (id),
    camera_occurred_at timestamp(6) with time zone NOT NULL,
    -- Canonical immutable proposal includes original model and evidence.
    proposal jsonb NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
    label text NOT NULL DEFAULT 'unreviewed' CHECK (label IN ('unreviewed', 'accepted', 'declined', 'uncertain')),
    feedback_source text CHECK (feedback_source IN ('player', 'human-review', 'ai-review')),
    reviewer_model text,
    reason text,
    reviewed_at timestamp(6) with time zone,
    last_replay_requested_at timestamp(6) with time zone,
    FOREIGN KEY (group_id, camera_id) REFERENCES vision_cameras (group_id, camera_id),
    FOREIGN KEY (group_id, session_id) REFERENCES vision_camera_sessions (group_id, session_id),
    CHECK (feedback_source <> 'ai-review' OR reviewer_model IS NOT NULL)
);
CREATE INDEX vision_hits_group_created_idx ON vision_hits (group_id, created_at DESC, id DESC);
CREATE INDEX vision_hits_camera_time_idx ON vision_hits (group_id, camera_id, live_match_id, session_id, camera_occurred_at);

-- Append-only through the API. Reset preserves earlier actor/source/labels;
-- explicit suggestion deletion removes its feedback history too.
CREATE TABLE vision_hit_feedback (
    hit_id text NOT NULL REFERENCES vision_hits (id) ON DELETE CASCADE,
    revision integer NOT NULL,
    actor_user_id text NOT NULL REFERENCES users (id),
    label text NOT NULL CHECK (label IN ('unreviewed', 'accepted', 'declined', 'uncertain')),
    source text NOT NULL CHECK (source IN ('player', 'human-review', 'ai-review')),
    reviewer_model text,
    reason text,
    created_at timestamp(6) with time zone NOT NULL,
    PRIMARY KEY (hit_id, revision),
    CHECK (source <> 'ai-review' OR reviewer_model IS NOT NULL)
);

-- +goose Down
DROP TABLE vision_hit_feedback;
DROP TABLE vision_hits;
DROP TABLE vision_camera_sessions;
DROP TABLE vision_cameras;
