-- Login throttling: repeated wrong passwords lock the account for a while.
ALTER TABLE users ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;

-- Two-step verification (TOTP, RFC 6238). mfa_last_step blocks reuse of a code within its window.
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_last_step BIGINT;

CREATE TABLE mfa_recovery_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  VARCHAR(128) NOT NULL,
    used_at    TIMESTAMPTZ
);
CREATE INDEX idx_mfa_recovery_codes_user ON mfa_recovery_codes(user_id);

-- A password-verified sign-in waiting for its second factor.
CREATE TABLE mfa_challenges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempts    INT NOT NULL DEFAULT 0,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email outbox: written in the same transaction as the notification, sent by a job with retry and backoff.
CREATE TABLE notification_deliveries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id  UUID REFERENCES notifications(id) ON DELETE CASCADE,
    notification_type VARCHAR(64) NOT NULL,
    recipient        VARCHAR(255) NOT NULL,
    subject          VARCHAR(255) NOT NULL,
    body             TEXT NOT NULL,
    status           VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'SENDING', 'RETRY', 'SENT', 'DEAD')),
    attempts         INT NOT NULL DEFAULT 0,
    next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at          TIMESTAMPTZ
);
CREATE INDEX idx_notification_deliveries_due ON notification_deliveries(next_attempt_at)
    WHERE status IN ('PENDING', 'SENDING', 'RETRY');
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status, created_at DESC);

-- Background CSV exports.
CREATE TABLE export_jobs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_type        VARCHAR(40) NOT NULL,
    status             VARCHAR(16) NOT NULL DEFAULT 'QUEUED'
                           CHECK (status IN ('QUEUED', 'RUNNING', 'READY', 'FAILED', 'EXPIRED')),
    requested_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_by_name  VARCHAR(255),
    row_count          INT,
    file_name          VARCHAR(255),
    error              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    expires_at         TIMESTAMPTZ
);
CREATE INDEX idx_export_jobs_queue ON export_jobs(status, created_at);

-- Privacy requests: account deletion runs after a grace period, or when staff complete it.
CREATE TABLE privacy_requests (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    subject_label      VARCHAR(255) NOT NULL,
    request_type       VARCHAR(20) NOT NULL CHECK (request_type IN ('DELETION')),
    status             VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    requested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at             TIMESTAMPTZ NOT NULL,
    completed_at       TIMESTAMPTZ,
    completed_by_name  VARCHAR(255),
    notes              TEXT
);
CREATE INDEX idx_privacy_requests_due ON privacy_requests(status, due_at);
