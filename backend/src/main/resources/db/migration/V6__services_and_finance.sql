-- Professional services catalogue, orders, and a gateway-agnostic finance trail
-- (quotes -> invoices -> payments). No card data is ever stored here.

CREATE TABLE service_packages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           VARCHAR(128) NOT NULL UNIQUE,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    price          NUMERIC(12,2) NOT NULL,
    currency       VARCHAR(8) NOT NULL DEFAULT 'ZMW',
    turnaround     VARCHAR(128),
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference           VARCHAR(64) NOT NULL UNIQUE,
    package_id          UUID NOT NULL REFERENCES service_packages(id),
    customer_id         UUID NOT NULL REFERENCES users(id),
    status              VARCHAR(32) NOT NULL DEFAULT 'ENQUIRY'
                            CHECK (status IN
                                ('ENQUIRY','REQUIREMENTS_RECEIVED','QUOTED','ACCEPTED','PAYMENT_PENDING',
                                 'PAID','ASSIGNED','IN_PROGRESS','REVIEW','REVISION','COMPLETED','CANCELLED')),
    requirements        TEXT,
    assigned_officer_id UUID REFERENCES users(id),
    revision_count      INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    version             BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);

CREATE TABLE service_order_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    sender_id  UUID NOT NULL REFERENCES users(id),
    message    TEXT NOT NULL,
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_order_messages_order ON service_order_messages(order_id);

CREATE TABLE service_deliverables (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    file_asset_id   UUID NOT NULL REFERENCES file_assets(id),
    revision_number INTEGER NOT NULL DEFAULT 0,
    uploaded_by     UUID REFERENCES users(id),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_deliverables_order ON service_deliverables(order_id);

CREATE TABLE quotes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    amount      NUMERIC(12,2) NOT NULL,
    currency    VARCHAR(8) NOT NULL DEFAULT 'ZMW',
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ
);
CREATE INDEX idx_quotes_order ON quotes(order_id);

CREATE TABLE invoices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference   VARCHAR(64) NOT NULL UNIQUE,
    order_id    UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    amount      NUMERIC(12,2) NOT NULL,
    currency    VARCHAR(8) NOT NULL DEFAULT 'ZMW',
    status      VARCHAR(32) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID','PAID','CANCELLED')),
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at      TIMESTAMPTZ,
    paid_at     TIMESTAMPTZ
);
CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount              NUMERIC(12,2) NOT NULL,
    method              VARCHAR(64),
    provider_reference  VARCHAR(128),
    status              VARCHAR(32) NOT NULL DEFAULT 'INITIATED'
                            CHECK (status IN ('INITIATED','PENDING','SUCCEEDED','FAILED','EXPIRED','PARTIALLY_REFUNDED','REFUNDED')),
    recorded_by         UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
