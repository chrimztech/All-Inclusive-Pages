# Operations runbook

How to deploy, run, back up, restore and recover the EOZ platform. Commands assume Ubuntu 22.04/24.04 unless noted.

## 1. What runs where

| Component | What it is | Needs |
|---|---|---|
| API | `backend/` Spring Boot jar (Java 21), port 8081 | PostgreSQL, SMTP, disk for `data/` (uploads, backups, exports), `pg_dump`/`pg_restore` matching the server version |
| Web app | `npm run build` output (`.output/`, Nitro server) | Node 22+, `VITE_API_URL` set **at build time** |
| Database | PostgreSQL 16+ (18 recommended) | Daily backups (built in) plus server-level protection |
| Reverse proxy | Nginx in front of both | TLS certificates |

All background jobs run inside the API process (see README → Operations). **Run a single API instance for now.** Email sending and CSV exports claim work with `FOR UPDATE SKIP LOCKED` and are safe with several instances, and alerts are de-duplicated in the database. But the nightly backup and retention jobs would run once per instance.

## 2. Deploying

### Option A — containers

```sh
cp .env.example .env          # set real secrets: JWT_SECRET, EOZ_DATA_KEY, PAYMENT_WEBHOOK_SECRET, DB_PASSWORD, MAIL_*
docker compose up -d --build  # PostgreSQL, API, Mailpit
```

For production, remove the `mailpit` service and point `MAIL_HOST` at your real SMTP relay. Also remove the published PostgreSQL port.

### Option B — Ubuntu + Nginx + systemd

```sh
sudo apt install openjdk-21-jre-headless postgresql-client-18 nginx
sudo useradd --system --home /opt/eoz eoz
sudo mkdir -p /opt/eoz/data && sudo chown -R eoz:eoz /opt/eoz
cd backend && mvn -DskipTests package && sudo cp target/eoz-backend-0.1.0.jar /opt/eoz/eoz-backend.jar
```

`/etc/eoz/eoz.env` (mode 600, owner root) holds the environment variables from `.env.example`. Also set `FORWARD_HEADERS_STRATEGY=native` so client IPs come from Nginx.

`/etc/systemd/system/eoz-api.service`:

```ini
[Unit]
Description=EOZ API
After=network-online.target postgresql.service

[Service]
User=eoz
WorkingDirectory=/opt/eoz
EnvironmentFile=/etc/eoz/eoz.env
ExecStart=/usr/bin/java -Xms256m -Xmx768m -jar /opt/eoz/eoz-backend.jar
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/eoz/data

[Install]
WantedBy=multi-user.target
```

Web app: `VITE_API_URL=https://api.example.zm/api/v1 npm ci && npm run build`. Then run `node .output/server/index.mjs` under a second systemd unit (port 3000).

Nginx (abridged):

```nginx
server {
  listen 443 ssl http2;
  server_name api.example.zm;
  client_max_body_size 12m;
  location / {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;   # ties Nginx logs to API logs and audit events
  }
}
server {
  listen 443 ssl http2;
  server_name www.example.zm;
  location / { proxy_pass http://127.0.0.1:3000; }
}
```

Set `CORS_ALLOWED_ORIGINS=https://www.example.zm`. Set `PUBLIC_WEB_URL` and `PUBLIC_API_URL` to the public addresses.

### Health checks

| URL | Use |
|---|---|
| `/actuator/health/liveness` | Restart the process if this fails |
| `/actuator/health/readiness` | Send traffic only when this is `UP` (database reachable) |
| `/actuator/health` | Overall status. SMTP is deliberately excluded, because email is queued and retried. |

## 3. Database migrations

Flyway applies migrations on start-up (`backend/src/main/resources/db/migration`).

- **Never edit a migration that has run anywhere shared.** Add a new `V<n>__description.sql`.
- Take a backup before deploying a release that contains migrations: **Admin → System health → Back up now**, or wait for the nightly run.
- Deploy: stop the API, deploy the new jar, start it. The start-up log reports `Successfully applied N migrations … now at version vX`.
- Migrations are tested from an empty database on every CI run (`mvn verify` against a fresh PostgreSQL).

### Rollback / forward-fix

Flyway migrations are not reversed automatically. If a release misbehaves:

1. **The problem is in the code and the schema is fine:** redeploy the previous jar. New columns or tables are additive and the old code ignores them.
2. **A migration itself is wrong:** write a new migration that corrects it (forward-fix) and release again. Do not edit or delete the failed one.
3. **Data was damaged:** restore the pre-release backup (section 4). Accept the loss of changes made since that backup.

## 4. Backups and restores

- **What:** a full `pg_dump` custom-format backup of the database, written to `BACKUP_DIR` (default `data/backups`).
- **When:** every 24 hours, and on demand from **Admin → System health**.
- **How many:** the newest `BACKUP_KEEP` (default 14) successful backups are kept, and older ones are deleted after each nightly run. If a nightly backup fails, administrators get an in-app alert (and email).
- **Off-site copies:** the built-in backups live on the same server. Copy `BACKUP_DIR` off the machine daily, for example with `rclone` to object storage or `rsync` to another host.
- **Uploaded files** (`data/uploads`) are not in the database dump. Back that folder up alongside it.

### Restore (from the admin console)

**Admin → System health → Database backups → Restore**. The platform first takes a safety backup of the current state, then runs `pg_restore --clean`.

Records deleted since the backup would silently come back. Instead they are flagged on the same page for staff to keep or delete again.

### Restore (disaster recovery, new server)

```sh
createdb -U postgres eoz_db
pg_restore -U postgres -d eoz_db --no-owner eoz-backup-YYYYMMDD-HHMMSS.dump
# then start the API; Flyway will apply any migrations newer than the backup
```

### Restore testing

Once a month, restore the latest backup into a scratch database. Start the API against it (`DB_URL=…/eoz_restore_test`) and check that `/actuator/health/readiness` is `UP`. Also sign in as staff and open a recent listing. Record the date and result.

### Recovery objectives

| Objective | Target with the built-in setup | How to improve it |
|---|---|---|
| RPO (data you can lose) | Up to 24 hours (nightly backup) | Continuous WAL archiving / point-in-time recovery at the PostgreSQL level (e.g. pgBackRest) brings this to minutes |
| RTO (time to recover) | About 1 hour: provision, restore the dump, start the API | Keep a warm standby database, and script the steps above |

## 5. Monitoring and logs

- **Correlation IDs:** every API response carries `X-Request-Id`, and every log line includes it in brackets. Error responses include `requestId`, and the web app shows its first 8 characters as a "reference" on server errors. Audit events store the ID along with IP and user agent, so a user's reference leads to the log lines and to the audit trail.
- **Security alerts:** administrators receive in-app and email alerts for:
  - account lockouts after repeated failed sign-ins
  - role and permission changes
  - unusually many exports
  - repeated rejected payment webhooks
  - failed nightly backups
- **Email delivery:** **Admin → Notifications** shows queued, retrying and failed emails, and each can be retried.

## 6. Incident response

1. **Contain.** Suspend affected accounts (**Admin → Users**), which revokes their sessions. If secrets may be exposed, rotate them:
   - `JWT_SECRET`: rotating it signs everyone out.
   - `PAYMENT_WEBHOOK_SECRET`: update the gateway at the same time.
   - SMTP credentials.

   Do **not** rotate `EOZ_DATA_KEY` without re-encrypting the stored two-step secrets, or two-step users are locked out.
2. **Investigate.** Use **Admin → Audit log** (actor, action, IP, user agent, request ID) and the API logs, filtered by request ID.
3. **Recover.** Restore from backup if data was altered (section 4). Review the restore flags.
4. **Notify.** If personal data was affected, notify the people concerned and the Data Protection Commissioner as the Data Protection Act No. 3 of 2021 requires. Record what happened, when, and what was done.
5. **Learn.** Write a short post-incident note: timeline, cause, fix, follow-up actions.
