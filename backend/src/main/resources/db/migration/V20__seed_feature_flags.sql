INSERT INTO feature_flags (key, enabled, description) VALUES
    ('moderation.require-source-link', TRUE, 'Blocks submission without an official source URL or document.'),
    ('moderation.auto-archive-deadline', TRUE, 'Listings disappear from the board the morning after the closing date.'),
    ('moderation.second-reviewer-featured', FALSE, 'Featured placements need approval from a second staff member.'),
    ('moderation.public-report-form', TRUE, 'Allows anyone to report a listing without signing in.')
ON CONFLICT (key) DO NOTHING;
