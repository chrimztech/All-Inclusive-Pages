-- Canonical content items + per-channel variants (the content-distribution engine): one
-- verified fact set, many channel-adapted presentations. A content item may be a scheduled
-- calendar entry (morning/afternoon/evening series) or a distribution of a published opportunity.

CREATE TABLE content_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title          VARCHAR(255) NOT NULL,
    series         VARCHAR(64) CHECK (series IN ('MORNING_DEVOTION','AFTERNOON_CAREER','EVENING_DEVOTION','OPPORTUNITY_POST','GENERAL')),
    body           TEXT NOT NULL,
    opportunity_id UUID REFERENCES opportunities(id),
    status         VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
                       CHECK (status IN ('DRAFT','PENDING_REVIEW','APPROVED','SCHEDULED','PUBLISHED')),
    scheduled_at   TIMESTAMPTZ,
    published_at   TIMESTAMPTZ,
    version_hash   VARCHAR(16) NOT NULL,
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_scheduled ON content_items(scheduled_at);

CREATE TABLE content_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    channel         VARCHAR(32) NOT NULL CHECK (channel IN ('WHATSAPP','FACEBOOK','LINKEDIN','TIKTOK')),
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (content_item_id, channel)
);
