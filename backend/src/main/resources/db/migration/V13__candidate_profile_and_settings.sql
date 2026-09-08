-- Candidate profile already has its table (V1); add alert_subscriptions structure fixes,
-- organisation_members status (to represent an invited-but-not-yet-active teammate), and the
-- admin-configurable settings/feature-flags tables required by the spec.

ALTER TABLE organisation_members ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INVITED'));

-- Supports APPROVED -> SCHEDULED -> PUBLISHED (previously only a direct APPROVED -> PUBLISHED existed).
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Store skills as a simple comma-separated string rather than a native Postgres array, to avoid
-- Hibernate/JDBC array-type mapping friction for a field this simple.
ALTER TABLE candidate_profiles ALTER COLUMN skills TYPE TEXT USING array_to_string(skills, ',');

CREATE TABLE feature_flags (
    key         VARCHAR(128) PRIMARY KEY,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(255),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the admin-configurable org/contact settings the spec requires (previously hardcoded
-- in the frontend). Frontend can migrate to reading these via GET /api/v1/settings/public.
INSERT INTO system_settings (key, value) VALUES
    ('org.name', 'Echo Opportunities Zambia'),
    ('org.short_name', 'EOZ'),
    ('org.tagline', 'Connecting Talent. Creating Opportunities. Building Futures.'),
    ('org.phone', '0771 538 765'),
    ('org.email', 'echoopportunitieszambia@gmail.com'),
    ('org.location', 'Lusaka, Zambia'),
    ('org.social.whatsapp', 'https://whatsapp.com/channel/0029Vb6cAbO7z4kmbz8ii90I'),
    ('org.social.facebook', 'https://www.facebook.com/share/192MkwvvMi/?mibextid=wwXIfr'),
    ('org.social.linkedin', 'https://www.linkedin.com/company/echo-opportunities-zambia/'),
    ('org.social.tiktok', 'https://www.tiktok.com/@echo.opportunitie?_r=1&_t=ZS-97uZaCEmAQp');
