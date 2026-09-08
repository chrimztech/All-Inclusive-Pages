CREATE TABLE invoice_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    unit_price  NUMERIC(12,2) NOT NULL,
    tax_rate    NUMERIC(5,4) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Allow invoices to carry a refunded/partially-refunded status once a refund is recorded.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('UNPAID','PAID','CANCELLED','PARTIALLY_REFUNDED','REFUNDED'));

-- Every financial adjustment requires a reason and an authorising actor (mandatory per spec).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reason VARCHAR(255);
