-- Reference data + illustrative published opportunities matching the public site's
-- original mock content, so the frontend renders real API data once wired.

INSERT INTO roles (name, description) VALUES
    ('CANDIDATE', 'Job seeker / candidate'),
    ('EMPLOYER', 'Organisation representative'),
    ('CONTENT_OFFICER', 'Drafts, verifies and publishes opportunities'),
    ('RECRUITMENT_OFFICER', 'Manages recruitment projects and candidates'),
    ('SERVICE_OFFICER', 'Manages professional service orders'),
    ('FINANCE_OFFICER', 'Manages quotes, invoices and payments'),
    ('MANAGER', 'Approves sensitive content and changes'),
    ('ADMIN', 'System administrator'),
    ('AUDITOR', 'Read-only access to records and audit events');

INSERT INTO permissions (code, description) VALUES
    ('OPPORTUNITY_CREATE', 'Create opportunity drafts'),
    ('OPPORTUNITY_PUBLISH', 'Approve and publish opportunities'),
    ('OPPORTUNITY_MODERATE', 'Review, approve or reject opportunities'),
    ('ORGANISATION_VERIFY', 'Approve or reject organisation verification'),
    ('APPLICATION_MANAGE', 'Manage application status and notes'),
    ('USER_MANAGE', 'Manage users, roles and permissions'),
    ('AUDIT_READ', 'Read audit events'),
    ('SETTINGS_MANAGE', 'Manage system settings');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'ADMIN';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'CONTENT_OFFICER' AND p.code IN ('OPPORTUNITY_CREATE','OPPORTUNITY_MODERATE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'MANAGER' AND p.code IN ('OPPORTUNITY_PUBLISH','ORGANISATION_VERIFY');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'RECRUITMENT_OFFICER' AND p.code IN ('APPLICATION_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'AUDITOR' AND p.code IN ('AUDIT_READ');

INSERT INTO opportunity_categories (code, name, description) VALUES
    ('JOBS', 'Jobs', 'Employment vacancies'),
    ('INTERNSHIPS', 'Internships', 'Internships and graduate programmes'),
    ('SCHOLARSHIPS', 'Scholarships', 'Scholarships and bursaries'),
    ('GRANTS', 'Grants', 'SME and NGO grants / funding'),
    ('TENDERS', 'Tenders', 'Public and private tenders'),
    ('TRAINING', 'Training', 'Training, workshops and short courses');

-- Demo admin user. Password is "ChangeMe123!" (bcrypt) — rotate before any shared/staging use.
INSERT INTO users (id, email, password_hash, full_name, phone, status, email_verified)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@eoz.zm',
        '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi6l5b1sNfmGT6Sxi7uPWuMy2qwZgv2',
        'EOZ System Administrator', '0771538765', 'ACTIVE', TRUE);

INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM roles WHERE name = 'ADMIN';

-- Illustrative published opportunities (fictional, matching the public site's original demo content).
INSERT INTO opportunities (
    reference, slug, title, category_id, organisation_name, description, requirements,
    location, region, work_mode, opportunity_value, opportunity_value_unit, salary_visible,
    deadline, application_mode, application_url, application_email, application_address,
    source, verified, status, published_at
)
SELECT
    'EOZ-OPP-2026-000001', 'senior-data-analyst-mfumu', 'Senior Data Analyst',
    (SELECT id FROM opportunity_categories WHERE code = 'JOBS'),
    'Mfumu Analytics',
    'Lead reporting and analytics for a Lusaka-based data consultancy serving mining, banking and public-sector clients.',
    'Degree in Statistics, Computer Science, Economics or related field; 4+ years working with SQL and a BI tool; experience presenting insight to non-technical stakeholders',
    'Lusaka', 'Lusaka', 'Hybrid', 'K 12,500', '/month', TRUE,
    now() + interval '2 days', 'EXTERNAL_URL', 'https://mfumu-analytics.zm/careers', NULL, NULL,
    'mfumu-analytics.zm/careers', TRUE, 'PUBLISHED', now() - interval '2 days'
UNION ALL SELECT
    'EOZ-OPP-2026-000002', 'commonwealth-postgraduate-award', 'Commonwealth Postgraduate Award — MSc Engineering',
    (SELECT id FROM opportunity_categories WHERE code = 'SCHOLARSHIPS'),
    'Commonwealth Scholarship Commission',
    'Fully funded postgraduate study in the United Kingdom for Zambian engineering graduates with a strong development focus.',
    'First-class or upper second-class undergraduate degree; Zambian citizenship or permanent residency; development impact statement',
    NULL, 'National', 'Full-time', 'Full', 'funded', FALSE,
    now() + interval '9 days', 'EXTERNAL_URL', 'https://cscuk.ac.uk', NULL, NULL,
    'cscuk.ac.uk', TRUE, 'PUBLISHED', now() - interval '5 days'
UNION ALL SELECT
    'EOZ-OPP-2026-000003', 'women-led-agribusiness-grant', 'Women-Led Agribusiness Seed Grant',
    (SELECT id FROM opportunity_categories WHERE code = 'GRANTS'),
    'Chobe Foundation',
    'Seed funding and mentorship for women-led agribusinesses processing local produce for regional markets.',
    'Registered Zambian business with majority female ownership; trading for at least 12 months; two-year growth plan',
    NULL, 'National', 'Remote', 'K 50,000', 'grant', TRUE,
    now() + interval '14 days', 'EXTERNAL_URL', 'https://chobefoundation.org', NULL, NULL,
    'chobefoundation.org', FALSE, 'PUBLISHED', now() - interval '7 days'
UNION ALL SELECT
    'EOZ-OPP-2026-000004', 'engineering-intern-zambezi', 'Engineering Intern — Civil Structures',
    (SELECT id FROM opportunity_categories WHERE code = 'INTERNSHIPS'),
    'Zambezi Build Co.',
    'Six-month structured internship on active civil works in Kitwe, supervised by chartered engineers.',
    'Final-year or recently graduated civil engineering student; willing to relocate to Kitwe; basic AutoCAD competence',
    'Kitwe', 'Copperbelt', 'On-site', 'K 2,000', '/month', TRUE,
    now() + interval '21 days', 'EMPLOYER_EMAIL', NULL, 'recruitment@zambezibuild.co.zm', NULL,
    'zambezibuild.co.zm/jobs', TRUE, 'PUBLISHED', now() - interval '3 days'
UNION ALL SELECT
    'EOZ-OPP-2026-000005', 'solar-units-tender-moh', 'Supply of Solar Units — District Health Posts',
    (SELECT id FROM opportunity_categories WHERE code = 'TENDERS'),
    'Ministry of Health',
    'Supply and installation of off-grid solar systems across 42 rural health posts in four provinces.',
    'ZPPA registration in the relevant category; proof of similar completed contracts; bid security as specified',
    NULL, 'National', 'Public', 'K 1.2M', 'contract', TRUE,
    now() + interval '5 days', 'PHYSICAL_ADDRESS', NULL, NULL,
    'Procurement Unit, Ministry of Health Headquarters, Lusaka — sealed bid submission per the tender document',
    'health.gov.zm/tenders', TRUE, 'PUBLISHED', now() - interval '1 days'
UNION ALL SELECT
    'EOZ-OPP-2026-000006', 'digital-skills-training-lusaka', 'Digital Skills Bootcamp — Data & Cloud',
    (SELECT id FROM opportunity_categories WHERE code = 'TRAINING'),
    'Lusaka Skills Institute',
    'Twelve-week practical bootcamp in spreadsheets, SQL and cloud fundamentals for early-career professionals.',
    'Grade 12 certificate; own laptop; evening availability',
    'Lusaka', 'Lusaka', 'Evening', 'K 1,800', 'course fee', TRUE,
    now() + interval '11 days', 'EXTERNAL_URL', 'https://lusakaskills.zm/programmes', NULL, NULL,
    'lusakaskills.zm/programmes', TRUE, 'PUBLISHED', now() - interval '4 days'
UNION ALL SELECT
    'EOZ-OPP-2026-000007', 'programme-officer-ngo', 'Programme Officer — Youth Livelihoods',
    (SELECT id FROM opportunity_categories WHERE code = 'JOBS'),
    'Kalulu Development Trust',
    'Coordinate youth livelihood programming across Central Province, including partner management and reporting.',
    'Degree in Development Studies or Social Sciences; 3+ years NGO programme experience; valid driving licence',
    NULL, 'Central', 'On-site', 'K 18,000', '/month', TRUE,
    now() + interval '8 days', 'EXTERNAL_URL', 'https://kalulutrust.org/vacancies', NULL, NULL,
    'kalulutrust.org/vacancies', TRUE, 'PUBLISHED', now() - interval '6 days'
UNION ALL SELECT
    'EOZ-OPP-2026-000008', 'graduate-trainee-bank', 'Graduate Trainee Programme 2026',
    (SELECT id FROM opportunity_categories WHERE code = 'INTERNSHIPS'),
    'Zambezi Commercial Bank',
    'An 18-month rotation across retail, risk and operations for high-performing recent graduates.',
    'Merit or distinction degree completed within 2 years; under 27 years of age; strong numeracy',
    'Lusaka', 'Lusaka', 'Full-time', 'K 6,500', '/month', TRUE,
    now() + interval '17 days', 'EXTERNAL_URL', 'https://zcb.co.zm/graduates', NULL, NULL,
    'zcb.co.zm/graduates', TRUE, 'PUBLISHED', now() - interval '2 days';

INSERT INTO reference_sequences (prefix, year, last_value) VALUES
    ('EOZ-OPP', EXTRACT(YEAR FROM now())::INT, 8),
    ('EOZ-APP', EXTRACT(YEAR FROM now())::INT, 0),
    ('EOZ-SVC', EXTRACT(YEAR FROM now())::INT, 0),
    ('EOZ-REC', EXTRACT(YEAR FROM now())::INT, 0);
