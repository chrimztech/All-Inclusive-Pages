-- ===================== Organisations: richer profile, SME classification =====================

ALTER TABLE organisations
    ADD COLUMN logo_file_id        UUID REFERENCES file_assets(id),
    ADD COLUMN business_type       VARCHAR(32)
                                       CHECK (business_type IN
                                           ('SOLE_PROPRIETORSHIP','PARTNERSHIP','LIMITED_COMPANY','COOPERATIVE',
                                            'NGO_NONPROFIT','GOVERNMENT','INFORMAL_SME','OTHER')),
    ADD COLUMN size_band           VARCHAR(32)
                                       CHECK (size_band IN ('MICRO_1_4','SMALL_5_49','MEDIUM_50_249','LARGE_250_PLUS')),
    ADD COLUMN tpin                VARCHAR(32),
    ADD COLUMN founded_year        INTEGER,
    ADD COLUMN contact_person_name VARCHAR(255),
    ADD COLUMN contact_person_role VARCHAR(128),
    ADD COLUMN contact_phone       VARCHAR(32),
    ADD COLUMN linkedin_url        VARCHAR(255),
    ADD COLUMN facebook_url        VARCHAR(255);

-- ===================== Candidate profiles: photo, CV, availability, structured history =====================

ALTER TABLE candidate_profiles
    ADD COLUMN photo_file_id           UUID REFERENCES file_assets(id),
    ADD COLUMN resume_file_id          UUID REFERENCES file_assets(id),
    ADD COLUMN availability            VARCHAR(32)
                                           CHECK (availability IN ('IMMEDIATE','TWO_WEEKS','ONE_MONTH','NEGOTIABLE')),
    ADD COLUMN salary_expectation_min  NUMERIC(12,2),
    ADD COLUMN salary_expectation_max  NUMERIC(12,2),
    ADD COLUMN salary_currency         VARCHAR(8),
    ADD COLUMN linkedin_url            VARCHAR(255),
    ADD COLUMN portfolio_url           VARCHAR(255);

CREATE TABLE candidate_work_experience (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    employer_name     VARCHAR(255) NOT NULL,
    start_date        DATE,
    end_date          DATE,
    is_current        BOOLEAN NOT NULL DEFAULT FALSE,
    description       TEXT,
    display_order     INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidate_work_experience_candidate ON candidate_work_experience(candidate_user_id);

CREATE TABLE candidate_education (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution       VARCHAR(255) NOT NULL,
    qualification     VARCHAR(255) NOT NULL,
    field_of_study    VARCHAR(255),
    start_date        DATE,
    end_date          DATE,
    display_order     INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidate_education_candidate ON candidate_education(candidate_user_id);

-- ===================== Applications: CV attachment (defaults from the candidate's profile resume) =====================

ALTER TABLE applications
    ADD COLUMN resume_file_id UUID REFERENCES file_assets(id);

-- ===================== Opportunities: employment type, work arrangement, experience level, salary range =====================

ALTER TABLE opportunities
    ADD COLUMN employment_type   VARCHAR(32)
                                     CHECK (employment_type IN
                                         ('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','GIG_FREELANCE','VOLUNTEER')),
    ADD COLUMN work_arrangement  VARCHAR(16) CHECK (work_arrangement IN ('ONSITE','REMOTE','HYBRID')),
    ADD COLUMN experience_level  VARCHAR(16) CHECK (experience_level IN ('ENTRY','JUNIOR','MID','SENIOR','EXECUTIVE')),
    ADD COLUMN salary_min        NUMERIC(12,2),
    ADD COLUMN salary_max        NUMERIC(12,2);

-- Best-effort backfill of the new structured work_arrangement from the existing free-text work_mode column.
-- work_mode itself is left untouched — it remains available as a free-text nuance/description field.
UPDATE opportunities SET work_arrangement = 'REMOTE' WHERE work_arrangement IS NULL AND work_mode ILIKE '%remote%';
UPDATE opportunities SET work_arrangement = 'HYBRID' WHERE work_arrangement IS NULL AND work_mode ILIKE '%hybrid%';
UPDATE opportunities SET work_arrangement = 'ONSITE'
    WHERE work_arrangement IS NULL AND (work_mode ILIKE '%on-site%' OR work_mode ILIKE '%onsite%' OR work_mode ILIKE '%on site%');

-- ===================== Deferred plumbing: phone verification placeholder (no live OTP flow yet) =====================

ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE verification_tokens DROP CONSTRAINT IF EXISTS verification_tokens_type_check;
ALTER TABLE verification_tokens ADD CONSTRAINT verification_tokens_type_check
    CHECK (type IN ('EMAIL_VERIFY','PASSWORD_RESET','PHONE_VERIFY'));
