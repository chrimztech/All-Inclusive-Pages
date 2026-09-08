ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS includes TEXT;

UPDATE service_packages SET includes = CASE slug
    WHEN 'cv-writing' THEN 'Consultation call;Two revisions;PDF and editable file'
    WHEN 'cover-letter' THEN 'Role analysis;One revision;PDF and editable file'
    WHEN 'interview-coaching' THEN 'Mock interview;Written feedback;Follow-up question bank'
    WHEN 'linkedin-profile' THEN 'Keyword research;Full profile rewrite;One revision'
    WHEN 'business-profile' THEN 'Discovery session;Designed document;Two revisions'
    WHEN 'recruitment-support' THEN 'Role scoping;Screened shortlist;Interview coordination'
    WHEN 'career-guidance' THEN 'Career direction session;Application review;Action plan'
    WHEN 'marketing-promotion' THEN 'Campaign scoping;Channel-ready copy;Distribution report'
    WHEN 'skills-training' THEN 'Needs assessment;Facilitated session;Participant resources'
    ELSE includes
END;
