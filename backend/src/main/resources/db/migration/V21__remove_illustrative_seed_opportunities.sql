-- V2/V3 seeded fictional "illustrative" opportunities so the demo site had listings to show.
-- Real users now submit real listings through the app, so this placeholder content must not
-- persist on any fresh install (or ship in the live database) as if it were genuine.
--
-- Clears flagged_duplicate_of on ANY row pointing at a seed row being deleted (not just rows
-- that are themselves seed rows) — a non-seed opportunity can be flagged as a duplicate of one.
UPDATE opportunities SET flagged_duplicate_of = NULL
WHERE flagged_duplicate_of IN (
    SELECT id FROM opportunities WHERE reference LIKE 'EOZ-OPP-2026-00000%'
);

DELETE FROM applications WHERE opportunity_id IN (
    SELECT id FROM opportunities WHERE reference LIKE 'EOZ-OPP-2026-00000%'
);
DELETE FROM content_items WHERE opportunity_id IN (
    SELECT id FROM opportunities WHERE reference LIKE 'EOZ-OPP-2026-00000%'
);
DELETE FROM fraud_reports WHERE opportunity_id IN (
    SELECT id FROM opportunities WHERE reference LIKE 'EOZ-OPP-2026-00000%'
);
DELETE FROM recruitment_projects WHERE opportunity_id IN (
    SELECT id FROM opportunities WHERE reference LIKE 'EOZ-OPP-2026-00000%'
);
DELETE FROM opportunities WHERE reference LIKE 'EOZ-OPP-2026-00000%';
