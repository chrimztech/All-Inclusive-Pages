-- Recruitment ATS: staff-managed pipelines for EOZ-run recruitment engagements, separate
-- from the self-service candidate application flow (see: applications table).

CREATE TABLE recruitment_projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference       VARCHAR(64) NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    opportunity_id  UUID REFERENCES opportunities(id),
    organisation_id UUID REFERENCES organisations(id),
    status          VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ON_HOLD','CLOSED')),
    confidentiality VARCHAR(32) NOT NULL DEFAULT 'STANDARD' CHECK (confidentiality IN ('STANDARD','CONFIDENTIAL')),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recruitment_projects_status ON recruitment_projects(status);

CREATE TABLE pipeline_candidates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID NOT NULL REFERENCES recruitment_projects(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255),
    candidate_user_id UUID REFERENCES users(id),
    stage          VARCHAR(32) NOT NULL DEFAULT 'RECEIVED'
                       CHECK (stage IN
                           ('RECEIVED','SCREENING','LONGLISTED','SHORTLISTED','ASSESSMENT','INTERVIEW',
                            'REFERENCE_CHECK','OFFER','HIRED','REJECTED','WITHDRAWN')),
    source         VARCHAR(128),
    added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipeline_candidates_project ON pipeline_candidates(project_id);
CREATE INDEX idx_pipeline_candidates_stage ON pipeline_candidates(stage);

CREATE TABLE pipeline_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID NOT NULL REFERENCES pipeline_candidates(id) ON DELETE CASCADE,
    author_id       UUID REFERENCES users(id),
    classification  VARCHAR(32) NOT NULL DEFAULT 'PRIVATE_INTERNAL'
                        CHECK (classification IN ('PRIVATE_INTERNAL','CLIENT_VISIBLE')),
    note            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipeline_notes_candidate ON pipeline_notes(candidate_id);
