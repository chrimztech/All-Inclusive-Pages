-- Two-step secrets are now stored encrypted (AES-GCM, "v1:" + base64), which is longer than the raw base32 key.
ALTER TABLE users ALTER COLUMN mfa_secret TYPE VARCHAR(255);
