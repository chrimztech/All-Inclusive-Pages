-- V2 seeded a permissions/role_permissions schema that was never actually read by the
-- application — every @PreAuthorize check was hardcoded to role names, making this table
-- pure dead weight. This migration completes the permission set (adding codes for domains
-- that had no permission at all: content, finance, services, staff inbox, reports, system
-- operations) and brings every staff role's grants in line with what it can already do today,
-- so switching @PreAuthorize to hasAuthority(...) checks is a no-op for current behaviour.

INSERT INTO permissions (code, description) VALUES
    ('CONTENT_MANAGE', 'Create, review and publish content calendar items'),
    ('FINANCE_MANAGE', 'Manage invoices, payments and refunds'),
    ('SERVICE_VIEW', 'View service orders'),
    ('SERVICE_MANAGE', 'Issue quotes, assign officers and change service order status'),
    ('STAFF_INBOX_MANAGE', 'Manage contact messages and the notification feed'),
    ('REPORTS_VIEW', 'View platform reporting and analytics'),
    ('SYSTEM_MANAGE', 'View system health and manage database backups')
ON CONFLICT (code) DO NOTHING;

-- ADMIN: every permission, including ones added above or in the future.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- CONTENT_OFFICER: already has OPPORTUNITY_CREATE, OPPORTUNITY_MODERATE.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'CONTENT_OFFICER' AND p.code = 'CONTENT_MANAGE'
ON CONFLICT DO NOTHING;

-- MANAGER: broad senior-staff role — appears in nearly every staff-only @PreAuthorize group today.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'MANAGER' AND p.code IN (
    'OPPORTUNITY_MODERATE', 'APPLICATION_MANAGE', 'CONTENT_MANAGE', 'FINANCE_MANAGE',
    'SERVICE_VIEW', 'SERVICE_MANAGE', 'STAFF_INBOX_MANAGE', 'REPORTS_VIEW'
)
ON CONFLICT DO NOTHING;

-- RECRUITMENT_OFFICER: already has APPLICATION_MANAGE.

-- SERVICE_OFFICER: had no permissions at all before this migration.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SERVICE_OFFICER' AND p.code IN ('SERVICE_VIEW', 'SERVICE_MANAGE')
ON CONFLICT DO NOTHING;

-- FINANCE_OFFICER: had no permissions at all before this migration.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'FINANCE_OFFICER' AND p.code IN ('SERVICE_VIEW', 'FINANCE_MANAGE')
ON CONFLICT DO NOTHING;

-- AUDITOR: already has AUDIT_READ.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'AUDITOR' AND p.code = 'REPORTS_VIEW'
ON CONFLICT DO NOTHING;
