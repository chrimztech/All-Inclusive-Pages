-- Interview scheduling, scorecards (feedback) and lightweight talent-pool tagging/search
-- on top of the existing recruitment pipeline.

CREATE TABLE interviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id  UUID NOT NULL REFERENCES pipeline_candidates(id) ON DELETE CASCADE,
    scheduled_at  TIMESTAMPTZ NOT NULL,
    mode          VARCHAR(32) NOT NULL DEFAULT 'ONLINE' CHECK (mode IN ('ONLINE','IN_PERSON','PHONE')),
    location      VARCHAR(255),
    notes         TEXT,
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);

CREATE TABLE interview_feedback (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    author_id     UUID REFERENCES users(id),
    rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interview_feedback_interview ON interview_feedback(interview_id);

CREATE TABLE candidate_tags (
    candidate_id UUID NOT NULL REFERENCES pipeline_candidates(id) ON DELETE CASCADE,
    tag          VARCHAR(64) NOT NULL,
    PRIMARY KEY (candidate_id, tag)
);
CREATE INDEX idx_candidate_tags_tag ON candidate_tags(tag);
