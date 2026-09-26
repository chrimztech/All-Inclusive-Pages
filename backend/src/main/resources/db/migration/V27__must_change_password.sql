-- Accounts created (or reset) by an administrator get a one-time password; the user must replace it on first sign-in.
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
