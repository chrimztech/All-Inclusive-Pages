# Echo Opportunities Zambia (EOZ)

Opportunities board, recruitment tools and professional-services desk for Echo Opportunities Zambia.

| Part | Stack | Folder | Dev port |
|---|---|---|---|
| Web app | TanStack Start + React 19, TanStack Query, Tailwind v4 | `src/` | 8082 (any free port works) |
| API | Spring Boot 3.3 / Java 21, Spring Security (JWT in HttpOnly cookies), Flyway | `backend/` | 8081 |
| Database | PostgreSQL 16+ (18 in Docker) | — | 5432 local / 5433 in Docker |

The project is connected to [Lovable](https://lovable.dev). Commits pushed to `main` sync back to the Lovable editor, so keep `main` building, and never force-push it.

## Quick start

### 1. Database and API

Either use Docker (Postgres + API + Mailpit to catch email):

```sh
cp .env.example .env        # optional; the defaults work locally
docker compose up --build
```

Or run against a local PostgreSQL:

```sh
createdb -U postgres eoz_db
cd backend && mvn spring-boot:run
```

Flyway creates the schema and seed data on start-up. The API is then available at:

- API: http://localhost:8081/api/v1
- API documentation (Swagger UI): http://localhost:8081/api/v1/docs, with the OpenAPI JSON at `/api/v1/openapi`
- Health: http://localhost:8081/actuator/health
- Caught email (Docker only): http://localhost:8025

Seeded staff login: `admin@eoz.zm` / `ChangeMe123!`. Change it before anyone else can reach the system.

### 2. Web app

```sh
npm ci
npm run dev -- --port 8082
```

Open http://localhost:8082. The app calls the API at `VITE_API_URL` (default `http://localhost:8081/api/v1`). The API only accepts browser calls from origins listed in `CORS_ALLOWED_ORIGINS`.

## Configuration

Everything is set through environment variables. Docker Compose reads them from `.env`; see `.env.example` and `backend/src/main/resources/application.yml`.

| Variable | Default | Notes |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | local `eoz_db`, `postgres` / `11111111` | Database connection |
| `JWT_SECRET` | dev placeholder | Signs session tokens. **Must** be a long random value in production. |
| `EOZ_DATA_KEY` | derived from `JWT_SECRET` | Encrypts stored two-step verification keys (AES-256-GCM). Set it in production and keep it stable: without it, rotating `JWT_SECRET` locks two-step users out. |
| `PAYMENT_WEBHOOK_SECRET` | dev placeholder | HMAC secret for `POST /api/v1/payments/webhook/{provider}` |
| `CORS_ALLOWED_ORIGINS` | localhost dev ports | Comma-separated web-app origins |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS` | `localhost:1025`, no auth | Outgoing SMTP. Email is queued and retried, so a mail outage never blocks users. |
| `RATE_LIMIT_AUTH_PER_MINUTE` / `RATE_LIMIT_FORMS_PER_MINUTE` | 20 / 10 | Per-IP limits for sign-in/sign-up/reset/two-step, and for public forms |
| `PUBLIC_WEB_URL`, `PUBLIC_API_URL` | `http://localhost:8082`, `http://localhost:8081/api/v1` | Public addresses used in email links (unsubscribe). Set them to the live domains. |
| `BACKUP_KEEP` | `14` | Successful backups to keep; older ones are deleted after each nightly backup |
| `BREACHED_PASSWORD_CHECK` | `local` | `local` checks the bundled common-password list; `hibp` also queries Have I Been Pwned (k-anonymity) |
| `FORWARD_HEADERS_STRATEGY` | `none` | Set to `native` behind Nginx or a load balancer, so client IPs in audit logs and rate limits are real |
| `SPRING_PROFILES_ACTIVE` / `DEMO_PASSWORD` | — / `Kafue-Demo-2026!` | `demo` loads fictional demonstration data once (see below) |
| `API_DOCS_ENABLED` | `true` | Set `false` to hide Swagger UI and the OpenAPI document |
| `BACKUP_DIR` | `./data/backups` | Where `pg_dump` backups are written (needs `pg_dump`/`pg_restore` on the PATH; the Docker image includes them) |
| `VITE_API_URL` | `http://localhost:8081/api/v1` | Web app → API base URL (build time) |

## Demo data

To explore every screen with realistic, fictional data, start the API once with `SPRING_PROFILES_ACTIVE=demo`. Use this for demos and development, never production.

- `mvn spring-boot:run -Dspring-boot.run.profiles=demo`, or set `SPRING_PROFILES_ACTIVE=demo` for Docker.
- The profile adds:
  - a published listing in every category, covering every application route
  - one listing awaiting moderation
  - verified, pending and under-review organisations
  - a candidate with a profile, an application and a service order
  - a content post with WhatsApp and Facebook variants
  - a recruitment project with a scorecard and pipeline
- Sign in as `demo.candidate@example.zm`, `demo.employer@example.zm` or `demo.staff@example.zm`, with password `DEMO_PASSWORD` (default `Kafue-Demo-2026!`).
- It runs once: later starts see the demo organisation and add nothing.

## Tests

| Suite | Command | Needs |
|---|---|---|
| API integration tests (JUnit + MockMvc against real PostgreSQL) | `cd backend && mvn test` | A database named `eoz_db_test` (`createdb -U postgres eoz_db_test`) |
| Unit and component tests (Vitest + Testing Library) | `npm test` | — |
| Browser end-to-end tests (Playwright) | `npm run test:e2e` | A running web app and API; see below |
| Lint and types | `npm run lint` and `npx tsc --noEmit` | — |

The end-to-end tests expect the web app at `E2E_BASE_URL` (default `http://localhost:5391`) and the API at `E2E_API_URL` (default `http://localhost:8091/api/v1`). The lifecycle tests need a staff account, set with `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`. Point them at a scratch database, not real data: the tests create users, listings and applications. On the first run, install the browser with `npx playwright install chromium`.

GitHub Actions (`.github/workflows/ci.yml`) runs the API tests against a PostgreSQL service, plus lint, type-check, unit tests and a production build of the web app, on every push to `main` and on every pull request.

## Operations

**Background jobs.** These run inside the API process:

| Job | Frequency |
|---|---|
| Close expired listings | every 5 min |
| Publish scheduled listings and content | every minute |
| Instant job alerts | every 5 min |
| Digests and deadline reminders | hourly |
| Email outbox | every 30 s; retries with back-off at 1 min, 5 min, 30 min, 2 h, 12 h, then marks the email failed |
| CSV exports | every 20 s |
| Data-retention clean-up | daily |
| Database backup | daily |

Staff can see failed emails and retry them under **Admin → Notifications**. Job-alert and service emails carry a sign-in-free unsubscribe link (`/unsubscribe`) and a one-click `List-Unsubscribe` header; security emails always send.

**Backups and restores.** Staff with backup permission run these from **Admin → Backups**. After a restore, records that had been deleted since the backup was taken are flagged for review, not silently brought back. Staff can keep each flagged record or delete it again.

**Privacy and retention.**
- A deletion request closes the account immediately.
- Personal data is erased after the grace period, 30 days by default, configurable under **Admin → Privacy requests**.
- Records that must be kept (applications, payments, consent evidence) are anonymised rather than deleted.
- The daily clean-up also removes:
  - old sessions and expired tokens
  - sent-email records older than 90 days
  - read notifications older than a year
  - export files after 7 days

**Security.**
- Five wrong passwords lock an account for 15 minutes and alert administrators.
- Two-step verification works with authenticator apps (TOTP) and gives 8 single-use recovery codes.
- Rate limits return HTTP 429.
- Unusually many exports alert administrators.
- Every staff action is written to the audit log (**Admin → Audit**).

## Project layout

```
src/routes/          file-based pages (routeTree.gen.ts is generated by the build; do not edit)
src/components/eoz/  EOZ components (site shell, dashboards, forms)
src/lib/             API client, auth hooks, helpers
e2e/                 Playwright tests
backend/src/main/java/zm/eoz/platform/   API, organised by feature
backend/src/main/resources/db/migration/ Flyway migrations (never edit one that has already run; add a new version)
```

More documentation:

- `docs/operations.md`: deployment (containers, or Ubuntu with Nginx and systemd), migrations, backup and restore, RPO/RTO, rollback, incident response
- `docs/security.md`: security and privacy controls, and the tests that cover them
- `docs/metrics.md`: definitions of every reported metric (generated by `python scripts/gen-metrics-doc.py`)
- `backend/README.md`: API notes, including what is simplified compared with the full specification

## Developer

Built by Chrishent Matakala Mutondo: +260 976 911 338 (calls and WhatsApp), chrishentmatakala@yahoo.com. See the `/developer-services` page.
