-- Generic file asset store, reused by organisation verification, service deliverables and
-- candidate documents. Binary content lives on local disk (or S3 in production); this table
-- is the metadata/access-control record.
CREATE TABLE file_assets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type    VARCHAR(64) NOT NULL,
    owner_id      VARCHAR(64) NOT NULL,
    file_name     VARCHAR(255) NOT NULL,
    content_type  VARCHAR(128) NOT NULL,
    size_bytes    BIGINT NOT NULL,
    storage_key   VARCHAR(255) NOT NULL UNIQUE,
    uploaded_by   UUID REFERENCES users(id),
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_file_assets_owner ON file_assets(owner_type, owner_id);

CREATE TABLE organisation_verification_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    reviewer_id     UUID REFERENCES users(id),
    decision        VARCHAR(32) NOT NULL CHECK (decision IN ('VERIFIED','REJECTED','SUSPENDED','UNDER_REVIEW')),
    notes           TEXT,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_verification_reviews_org ON organisation_verification_reviews(organisation_id);
