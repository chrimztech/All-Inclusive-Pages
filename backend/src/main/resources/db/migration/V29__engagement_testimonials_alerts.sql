-- Listing engagement and curation
ALTER TABLE opportunities ADD COLUMN featured      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE opportunities ADD COLUMN apply_clicks  BIGINT  NOT NULL DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN share_count   BIGINT  NOT NULL DEFAULT 0;
CREATE INDEX idx_opportunities_featured ON opportunities(featured) WHERE featured;

-- Admin-managed testimonials shown on the public home page
CREATE TABLE testimonials (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_name   VARCHAR(120) NOT NULL,
    author_role   VARCHAR(160),
    quote         TEXT         NOT NULL CHECK (char_length(quote) BETWEEN 10 AND 600),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order    INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Customer satisfaction on completed service orders
ALTER TABLE service_orders ADD COLUMN rating    SMALLINT CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE service_orders ADD COLUMN feedback  TEXT;
ALTER TABLE service_orders ADD COLUMN rated_at  TIMESTAMPTZ;

-- Alert delivery bookkeeping: each (subscription, listing) is announced once; digests remember when they last ran.
ALTER TABLE alert_subscriptions ADD COLUMN last_digest_at TIMESTAMPTZ;
CREATE TABLE alert_deliveries (
    subscription_id  UUID NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
    opportunity_id   UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    delivered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (subscription_id, opportunity_id)
);

-- Closing-soon reminders for saved listings, sent once per candidate and listing.
CREATE TABLE deadline_reminders (
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id   UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, opportunity_id)
);
