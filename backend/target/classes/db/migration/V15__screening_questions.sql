CREATE TABLE screening_questions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID NOT NULL REFERENCES recruitment_projects(id) ON DELETE CASCADE,
    question         TEXT NOT NULL,
    question_type    VARCHAR(16) NOT NULL DEFAULT 'TEXT' CHECK (question_type IN ('TEXT','YES_NO')),
    knockout_answer  VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_screening_questions_project ON screening_questions(project_id);

CREATE TABLE candidate_answers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id  UUID NOT NULL REFERENCES pipeline_candidates(id) ON DELETE CASCADE,
    question_id   UUID NOT NULL REFERENCES screening_questions(id) ON DELETE CASCADE,
    answer        TEXT,
    knocked_out   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (candidate_id, question_id)
);
