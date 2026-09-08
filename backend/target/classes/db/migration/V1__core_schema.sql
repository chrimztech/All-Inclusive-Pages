-- Core foundations: identity/RBAC, organisations, opportunities, applications, audit.
-- UUID generation via pgcrypto (gen_random_uuid), all timestamps stored UTC (timestamptz).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================== Identity & RBAC =====================

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(64) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(96) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(255) NOT NULL,
    phone          VARCHAR(32),
    status         VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE','SUSPENDED','PENDING_VERIFICATION','DEACTIVATED')),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    version        BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE verification_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    type       VARCHAR(32) NOT NULL CHECK (type IN ('EMAIL_VERIFY','PASSWORD_RESET')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_verification_tokens_user ON verification_tokens(user_id);

-- ===================== Organisations =====================

CREATE TABLE organisations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name          VARCHAR(255) NOT NULL,
    trading_name        VARCHAR(255),
    registration_number VARCHAR(128),
    sector              VARCHAR(128),
    size                VARCHAR(64),
    website             VARCHAR(255),
    address             VARCHAR(255),
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
                            CHECK (verification_status IN ('PENDING','UNDER_REVIEW','VERIFIED','REJECTED','SUSPENDED')),
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE organisation_members (
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_org     VARCHAR(32) NOT NULL DEFAULT 'MEMBER' CHECK (role_in_org IN ('OWNER','MEMBER')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organisation_id, user_id)
);

-- ===================== Opportunities =====================

CREATE TABLE opportunity_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(64) NOT NULL UNIQUE,
    name        VARCHAR(128) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE opportunities (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference                VARCHAR(64) NOT NULL UNIQUE,
    slug                     VARCHAR(255) NOT NULL UNIQUE,
    title                    VARCHAR(255) NOT NULL,
    category_id              UUID NOT NULL REFERENCES opportunity_categories(id),
    organisation_id          UUID REFERENCES organisations(id),
    organisation_name        VARCHAR(255) NOT NULL,
    description              TEXT NOT NULL,
    responsibilities         TEXT,
    requirements             TEXT,
    benefits                 TEXT,
    location                 VARCHAR(255),
    region                   VARCHAR(64),
    work_mode                VARCHAR(64),
    opportunity_value        VARCHAR(64),
    opportunity_value_unit   VARCHAR(64),
    salary_visible           BOOLEAN NOT NULL DEFAULT FALSE,
    currency                 VARCHAR(8) NOT NULL DEFAULT 'ZMW',
    slots                    INTEGER,
    opening_date             DATE,
    deadline                 TIMESTAMPTZ,
    application_mode         VARCHAR(32) NOT NULL
                                 CHECK (application_mode IN
                                     ('EXTERNAL_URL','EMPLOYER_EMAIL','PHYSICAL_ADDRESS','EOZ_HOSTED','INFORMATION_ONLY','EOZ_INTERNAL_HIRING')),
    application_url          VARCHAR(500),
    application_email        VARCHAR(255),
    application_address      TEXT,
    source                   VARCHAR(255),
    verified                 BOOLEAN NOT NULL DEFAULT FALSE,
    status                   VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
                                 CHECK (status IN
                                     ('DRAFT','PENDING_REVIEW','APPROVED','SCHEDULED','PUBLISHED','CLOSED','EXPIRED','ARCHIVED')),
    published_at             TIMESTAMPTZ,
    views_count              BIGINT NOT NULL DEFAULT 0,
    created_by               UUID REFERENCES users(id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                  BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_category ON opportunities(category_id);
CREATE INDEX idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX idx_opportunities_org ON opportunities(organisation_id);
CREATE INDEX idx_opportunities_published_status ON opportunities(status, deadline) WHERE status = 'PUBLISHED';

CREATE TABLE opportunity_attachments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    file_name     VARCHAR(255) NOT NULL,
    file_url      VARCHAR(500) NOT NULL,
    content_type  VARCHAR(128),
    size_bytes    BIGINT,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_opportunities (
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    saved_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, opportunity_id)
);

CREATE TABLE alert_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES opportunity_categories(id),
    keyword     VARCHAR(255),
    region      VARCHAR(64),
    frequency   VARCHAR(16) NOT NULL DEFAULT 'INSTANT' CHECK (frequency IN ('INSTANT','DAILY','WEEKLY')),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alert_subscriptions_user ON alert_subscriptions(user_id);

-- ===================== Candidates =====================

CREATE TABLE candidate_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    headline            VARCHAR(255),
    bio                 TEXT,
    location            VARCHAR(255),
    education_summary   TEXT,
    experience_summary  TEXT,
    skills              TEXT[],
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== Applications =====================

CREATE TABLE applications (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference      VARCHAR(64) NOT NULL UNIQUE,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    candidate_id   UUID NOT NULL REFERENCES users(id),
    status         VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED'
                       CHECK (status IN
                           ('SUBMITTED','SCREENING','LONGLISTED','SHORTLISTED','INTERVIEW','OFFER','HIRED','REJECTED','WITHDRAWN')),
    cover_note     TEXT,
    submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    version        BIGINT NOT NULL DEFAULT 0,
    UNIQUE (opportunity_id, candidate_id)
);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_opportunity ON applications(opportunity_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE TABLE application_documents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    file_name      VARCHAR(255) NOT NULL,
    file_url       VARCHAR(500) NOT NULL,
    doc_type       VARCHAR(64),
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE application_status_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status    VARCHAR(32),
    to_status      VARCHAR(32) NOT NULL,
    changed_by     UUID REFERENCES users(id),
    reason         TEXT,
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_status_history_app ON application_status_history(application_id);

-- ===================== Audit & Settings =====================

CREATE TABLE audit_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id       UUID REFERENCES users(id),
    action         VARCHAR(128) NOT NULL,
    entity_type    VARCHAR(64) NOT NULL,
    entity_id      VARCHAR(64),
    correlation_id VARCHAR(64),
    summary        TEXT,
    ip             VARCHAR(64),
    user_agent     VARCHAR(255),
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_time ON audit_events(occurred_at);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);

CREATE TABLE system_settings (
    key        VARCHAR(128) PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reference_sequences (
    prefix     VARCHAR(16) PRIMARY KEY,
    year       INTEGER NOT NULL,
    last_value BIGINT NOT NULL DEFAULT 0
);
