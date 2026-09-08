# EOZ Backend

Spring Boot 3 / Java 21 API for the Echo Opportunities Zambia platform.

## Run locally (no Docker)

Requires a local PostgreSQL 16+ instance with a superuser `postgres` / password matching `DB_PASSWORD` (defaults to `11111111`), and a database named `eoz_db`:

```
createdb -U postgres eoz_db
```

Then, from `backend/`:

```
mvn spring-boot:run
```

The app starts on `http://localhost:8081` (port 8080 is often already taken by another local dev server — check `application.yml` if you need to change it). Flyway applies migrations and seed data automatically on startup.

- Swagger UI: `http://localhost:8081/api/v1/docs`
- OpenAPI JSON: `http://localhost:8081/api/v1/openapi`
- Health: `http://localhost:8081/actuator/health`

Seeded admin login: `admin@eoz.zm` / `ChangeMe123!` (rotate before any shared use).

## Run via Docker Compose

From the repo root:

```
docker compose up --build
```

This starts PostgreSQL and the backend together. Copy `.env.example` to `.env` at the repo root first if you want to override defaults (DB password, JWT secret, CORS origins).

## Configuration

All configuration is environment-variable driven — see `src/main/resources/application.yml`. Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | local Postgres, `postgres` / `11111111` | Database connection |
| `JWT_SECRET` | dev placeholder | Signs access tokens — **must** be rotated for any non-local use |
| `CORS_ALLOWED_ORIGINS` | localhost dev ports | Comma-separated frontend origins allowed to call the API with credentials |
| `SERVER_PORT` | `8081` | HTTP port |

## Running the automated tests

Requires the `eoz_db_test` database (create it the same way as `eoz_db`, above — Flyway migrates it automatically on test startup):

```
createdb -U postgres eoz_db_test
mvn test
```

Tests are plain `*Test.java` classes (Surefire's default discovery pattern — `*IT.java` is a Failsafe convention and won't run under `mvn test`), run against real Postgres via `@SpringBootTest` + MockMvc, and are safe to re-run repeatedly (each run uses fresh random emails/titles rather than relying on a clean database).

## What's implemented vs. deferred

Implemented: foundations, JWT cookie auth + RBAC (roles/permissions seeded), opportunity publishing with the brand-rule application-route validation, public search/filter/pagination, candidate registration/login, EOZ-hosted applications, saved opportunities, organisation registration + staff verification workflow, generic local file storage (upload/download, MIME/size-limited), the full opportunity moderation lifecycle (submit → approve/reject/request-changes → publish) with audit trail and notifications, professional services catalogue + orders + quotes + invoices, in-app notifications (best-effort email alongside), an admin reporting overview endpoint, RFC 7807 errors, OpenAPI docs, Flyway migrations with seed data.

Also implemented in this pass: **recruitment ATS extensions** — interview scheduling, per-interview scorecards (1–5 rating + comments), candidate tagging and a talent-pool search endpoint (`GET /api/v1/recruitment/talent-pool?tag=&q=`) spanning all pipeline candidates regardless of project; **payment webhooks** — a gateway-agnostic `POST /api/v1/payments/webhook/{provider}` with HMAC-SHA256 signature verification and (provider, eventId) idempotency, wired to mark invoices/orders paid and notify the customer; **content-distribution engine** — canonical content items with per-channel variants (WhatsApp/Facebook/LinkedIn/TikTok), a version-hash per item, a DRAFT→PENDING_REVIEW→APPROVED→SCHEDULED→PUBLISHED workflow, and brand-rule-aware auto-generation from a linked opportunity (WhatsApp/LinkedIn carry the full application route; Facebook/TikTok withhold it and redirect to the WhatsApp channel) — all verified end-to-end with real HTTP calls, and the admin content-calendar page is wired to it. Test suite expanded to 9 tests including webhook signature/idempotency coverage.

Deliberately simplified relative to the full master spec (each would be a substantial project of its own to build out further): scorecards are a single rating+comment per interviewer rather than structured multi-criteria scorecards; the payment webhook has no real provider integration behind it (no live mobile-money/card gateway — it's a generic, provider-agnostic receiver you'd point a real gateway's webhook at); content scheduling has no background job that actually publishes at `scheduledAt` (the transition is manual); and test coverage remains a targeted starting set (auth, brand-rule validation, moderation permissions, webhook safety), not the full JUnit/Testcontainers/Playwright suite the spec calls for.
