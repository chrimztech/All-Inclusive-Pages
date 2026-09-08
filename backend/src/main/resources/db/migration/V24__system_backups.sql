CREATE TABLE system_backups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name     VARCHAR(255) NOT NULL,
    size_bytes    BIGINT,
    status        VARCHAR(20) NOT NULL,
    error_message TEXT,
    triggered_by  UUID REFERENCES users(id),
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_system_backups_started_at ON system_backups(started_at DESC);
