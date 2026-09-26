-- Sessions: one sign-in survives refresh-token rotation under a stable session_id, so it can be listed and revoked.
ALTER TABLE refresh_tokens ADD COLUMN session_id UUID;
UPDATE refresh_tokens SET session_id = id WHERE session_id IS NULL;
ALTER TABLE refresh_tokens ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE refresh_tokens ADD COLUMN user_agent VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(64);
CREATE INDEX idx_refresh_tokens_session ON refresh_tokens(session_id);

-- Consent history: every grant or withdrawal is a new row; the latest row per type is the current state.
CREATE TABLE consents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type  VARCHAR(40) NOT NULL
                      CHECK (consent_type IN ('TERMS', 'PRIVACY', 'OPPORTUNITY_ALERTS', 'SERVICE_COMMS')),
    granted       BOOLEAN NOT NULL,
    source        VARCHAR(60) NOT NULL,
    recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consents_user ON consents(user_id, recorded_at DESC);

-- Existing accounts: record what they agreed to at sign-up and their current preferences.
INSERT INTO consents (user_id, consent_type, granted, source, recorded_at)
SELECT id, 'TERMS', TRUE, 'REGISTRATION', created_at FROM users;
INSERT INTO consents (user_id, consent_type, granted, source, recorded_at)
SELECT id, 'PRIVACY', TRUE, 'REGISTRATION', created_at FROM users;
INSERT INTO consents (user_id, consent_type, granted, source, recorded_at)
SELECT id, 'OPPORTUNITY_ALERTS', opportunity_alerts_enabled, 'MIGRATED_PREFERENCE', now() FROM users;
INSERT INTO consents (user_id, consent_type, granted, source, recorded_at)
SELECT id, 'SERVICE_COMMS', service_comms_enabled, 'MIGRATED_PREFERENCE', now() FROM users;

-- Candidate languages and certifications
CREATE TABLE candidate_languages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language     VARCHAR(80) NOT NULL,
    proficiency  VARCHAR(20) NOT NULL CHECK (proficiency IN ('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, language)
);

CREATE TABLE candidate_certifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(160) NOT NULL,
    issuer          VARCHAR(160),
    issued_on       DATE,
    expires_on      DATE,
    credential_url  VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on)
);
CREATE INDEX idx_candidate_certifications_user ON candidate_certifications(user_id);

-- Listing version history: a snapshot whenever a listing's content or status actually changes.
CREATE TABLE opportunity_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id   UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    version_no       INT  NOT NULL,
    status           VARCHAR(32) NOT NULL,
    snapshot         JSONB NOT NULL,
    content_hash     VARCHAR(64) NOT NULL,
    changed_by_name  VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (opportunity_id, version_no)
);

-- Notification templates: admin-editable wording and email switch per notification type.
CREATE TABLE notification_templates (
    type              VARCHAR(64) PRIMARY KEY,
    subject_template  VARCHAR(255) NOT NULL,
    body_template     TEXT NOT NULL,
    email_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by_name   VARCHAR(255),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
