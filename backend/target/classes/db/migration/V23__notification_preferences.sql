ALTER TABLE users
    ADD COLUMN opportunity_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN service_comms_enabled BOOLEAN NOT NULL DEFAULT TRUE;
