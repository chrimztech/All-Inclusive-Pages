CREATE TABLE fraud_reports (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id    UUID REFERENCES opportunities(id),
    listing_reference VARCHAR(64),
    reason            VARCHAR(128) NOT NULL,
    description       TEXT,
    reporter_name     VARCHAR(255),
    reporter_email    VARCHAR(255),
    status            VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','DISMISSED')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at       TIMESTAMPTZ,
    resolved_by       UUID REFERENCES users(id)
);
CREATE INDEX idx_fraud_reports_status ON fraud_reports(status);
CREATE INDEX idx_fraud_reports_opportunity ON fraud_reports(opportunity_id);

-- Moderation decides rather than silently deleting: a submission that looks like a duplicate is
-- flagged (not blocked) so a content officer can confirm or dismiss the match.
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS flagged_duplicate_of UUID REFERENCES opportunities(id);
