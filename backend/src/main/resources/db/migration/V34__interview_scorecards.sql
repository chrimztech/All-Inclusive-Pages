-- Structured interview scorecards: each recruitment project defines the criteria interviewers score (1-5),
-- optionally weighted; feedback keeps its overall rating and adds a hiring recommendation.
CREATE TABLE scorecard_criteria (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES recruitment_projects(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    guidance    VARCHAR(500),
    weight      INTEGER NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 3),
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, name)
);
CREATE INDEX idx_scorecard_criteria_project ON scorecard_criteria(project_id, position);

CREATE TABLE interview_feedback_scores (
    feedback_id  UUID NOT NULL REFERENCES interview_feedback(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES scorecard_criteria(id),
    score        INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    PRIMARY KEY (feedback_id, criterion_id)
);

ALTER TABLE interview_feedback ADD COLUMN recommendation VARCHAR(16)
    CHECK (recommendation IN ('STRONG_NO', 'NO', 'YES', 'STRONG_YES'));
