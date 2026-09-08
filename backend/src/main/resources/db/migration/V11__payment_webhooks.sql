-- Idempotent webhook receipt log: each (provider, external_event_id) is processed at most once,
-- regardless of how many times the provider retries delivery.
CREATE TABLE payment_webhook_events (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider           VARCHAR(64) NOT NULL,
    external_event_id  VARCHAR(255) NOT NULL,
    payload            TEXT NOT NULL,
    received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, external_event_id)
);
