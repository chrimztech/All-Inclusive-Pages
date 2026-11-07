-- Several application contacts per listing: "To" addresses in application_email (comma-separated), plus CC and BCC.
ALTER TABLE opportunities ALTER COLUMN application_email TYPE TEXT;
ALTER TABLE opportunities ADD COLUMN application_cc TEXT;
ALTER TABLE opportunities ADD COLUMN application_bcc TEXT;

-- "Requirements" becomes free-form "Opportunity details" that keeps the poster's own line breaks. The old form joined
-- one-requirement-per-line input with "; " (and the page split it back into bullets), so restore those line breaks.
UPDATE opportunities SET requirements = replace(requirements, '; ', E'\n') WHERE requirements LIKE '%; %';
