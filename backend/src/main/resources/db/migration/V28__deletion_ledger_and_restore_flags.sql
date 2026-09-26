-- Every permanent delete is written to deletion_ledger. A database restore rewinds this table along with
-- everything else, so BackupService snapshots it before pg_restore and writes it back afterwards; any ledger
-- entry whose row exists again after the restore becomes a restore_flag for an administrator to resolve.
-- IF NOT EXISTS keeps this migration safe to re-run after restoring a dump taken before it was applied.

CREATE TABLE IF NOT EXISTS deletion_ledger (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type        VARCHAR(40)  NOT NULL,
    entity_id          UUID         NOT NULL,
    label              TEXT         NOT NULL,
    confirm_value      TEXT,
    erased_payments    BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_by_name    VARCHAR(255),
    deleted_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deletion_ledger_entity ON deletion_ledger(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS restore_flags (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id          UUID         NOT NULL,
    entity_type        VARCHAR(40)  NOT NULL,
    entity_id          UUID         NOT NULL,
    label              TEXT         NOT NULL,
    deleted_by_name    VARCHAR(255),
    deleted_at         TIMESTAMPTZ  NOT NULL,
    restored_from      VARCHAR(255) NOT NULL,
    flagged_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- What the restore quarantine changed (e.g. a live listing sent back to review), so "Keep" can undo it.
    quarantined_from   VARCHAR(32),
    resolution         VARCHAR(20)
                           CHECK (resolution IS NULL OR resolution IN ('KEPT', 'DELETED_AGAIN', 'GONE')),
    resolved_by_name   VARCHAR(255),
    resolved_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_restore_flags_open ON restore_flags(resolution, flagged_at DESC);
