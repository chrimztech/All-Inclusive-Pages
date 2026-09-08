-- V2 seeded the admin account with a fabricated (non-functional) bcrypt hash. This is the real
-- bcrypt hash for "ChangeMe123!" (dev-only password — rotate before any shared/staging use).
UPDATE users
SET password_hash = '$2a$10$0MQ89VgXB7GWzgHbffQlxuhXxCXgUGHOjHWhBH/NGdlScgOj9p85u'
WHERE email = 'admin@eoz.zm';
