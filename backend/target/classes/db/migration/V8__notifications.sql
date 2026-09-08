-- In-app notification feed. Email delivery is attempted best-effort alongside each insert
-- (see NotificationService); this table is the durable record and read-state.
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(64) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    body       TEXT,
    read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
