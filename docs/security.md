# Security and privacy controls

What the platform does to protect accounts and data, and where each control lives. Each control is covered by the automated tests named in brackets.

## Accounts and sign-in

| Control | Details |
|---|---|
| Sessions | Short-lived access token (15 min) in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. A refresh cookie lasts 14 days and is rotated on use. People can see and revoke their sessions; suspending an account revokes its sessions. |
| Passwords | BCrypt hashes. Passwords must be 8–128 characters, may not contain the person's name or email, and may not be on the bundled common-password list. Set `BREACHED_PASSWORD_CHECK=hibp` to also check Have I Been Pwned: only the first five characters of the password's SHA-1 hash are sent, and an unreachable service lets the password through rather than blocking sign-up. [HardeningTest] |
| Lockout | After 5 wrong passwords, the account locks for 15 minutes and administrators are alerted. [SecurityOperationsTest] |
| Two-step verification | Optional TOTP (authenticator apps) with 8 single-use recovery codes. Used codes can't be replayed. Stored keys are encrypted with AES-256-GCM (`EOZ_DATA_KEY`). [SecurityOperationsTest, TotpAndRateLimitTest] |
| Rate limits | Per-IP limits on sign-in, sign-up, password reset, two-step verification and public forms; excess requests get HTTP 429 with `Retry-After`. [TotpAndRateLimitTest] |
| Reset and verification tokens | Stored only as hashes, single-use, and time-limited. |

## Authorisation

- Every staff endpoint checks a **permission** (for example `OPPORTUNITY_MODERATE`, `FINANCE_MANAGE`), not just a role, on the server. The web app's hiding of menus is for convenience only.
- Owned records (applications, documents, listings, orders) are looked up **scoped to the signed-in person**, and strangers get 403/404. [FeatureGapsTest, PlatformFeaturesTest]
- Role and permission changes alert administrators and are audited.
- **Actions follow permissions too.** Inside a page someone may open, each action is shown only if its own permission is held (`useCan()`):
  - Publish, Schedule and Feature need `OPPORTUNITY_PUBLISH`, and Create opportunity needs `OPPORTUNITY_CREATE`.
  - Permanent delete and the retention run need `SYSTEM_MANAGE`.
  - Service management needs `SERVICE_MANAGE`, so finance staff get a view-only Services page.
  - Only an organisation's owner can invite or remove team members.
  - The console Overview shows report tiles, the moderation queue and audit events only to roles that can read them, plus a "Your sections" list.
- **401 vs 403.** Signed-out requests get `401 Sign in to continue.`, and signed-in requests without the permission get `403`.
- **No privilege escalation.**
  - Only administrators can grant or remove the ADMIN role, create admin accounts, or edit, reset, suspend or delete an admin's account.
  - Anyone else holding `USER_MANAGE` can only grant or remove roles whose permissions they hold themselves. The Users page offers only those (`GET /api/v1/admin/users/grantable-roles`).
  - Nobody can change their own roles or status.
  - The last active administrator can't be demoted or suspended, and every account keeps at least one role.
  - The CANDIDATE and EMPLOYER roles, held by every sign-up, can never be given staff permissions.
  - Role and status changes apply on the next request, because each request re-reads the account.

  [PrivilegeEscalationTest]
- **Service checks use permissions, never role names**, via `Access.hasAny` (applicants and CVs: `APPLICATION_MANAGE`; service orders: `SERVICE_VIEW`/`SERVICE_MANAGE`/`FINANCE_MANAGE`; staff edits of organisations: `ORGANISATION_VERIFY`). Changing a role's permissions on the Permissions page therefore changes what it can do everywhere. [AccessControlTest]
- **Files follow least privilege.** Being staff isn't enough to read someone's file:
  - CVs and documents: the owner, or `APPLICATION_MANAGE`
  - verification evidence: the organisation's members, or `ORGANISATION_VERIFY`
  - anything else: `SYSTEM_MANAGE`

  The generic upload endpoint only accepts your own documents and your own organisation's logo. A photo, CV or logo must be a file you uploaded yourself. [AccessControlTest]
- **Web app access policy** (`src/lib/access.ts`) is one table covering every area:
  - the candidate portal: candidates
  - the employer portal: employers and organisation team members (the listing form also admits staff with `OPPORTUNITY_CREATE`)
  - each staff console section: its permission
  - account pages: anyone signed in

  A gate in the app root renders a page only for people it allows. Signed-out visitors get a sign-in prompt that returns them to the page; everyone else gets a "Not part of your account" page with no page content. Menus, the footer's staff link and the public employer page's portal menu are filtered by the same rules. The sign-in `redirect` only accepts same-site paths (open-redirect guard). [access.test.ts, e2e/access.spec.ts]
- **Edit conflicts:** listing and organisation edits send the version they loaded (`If-Match`). If someone else saved in the meantime, the edit is refused (409) instead of silently overwriting their changes. [ListingSafeguardsTest]
- **Publication gate:** closing dates must be in the future. A listing whose closing date passed while waiting cannot be approved or published until it is extended. [ListingSafeguardsTest]

## Web and API hardening

| Control | Details |
|---|---|
| Security headers | `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` on API responses (not on the Swagger UI pages), plus HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` and a restrictive `Permissions-Policy`. [HardeningTest] |
| CSRF | Session cookies are `SameSite=Lax`, so browsers never send them on cross-site POST/PATCH/DELETE, and CORS allows only listed origins. Together these cover CSRF for this JSON API without a token. |
| CORS | Allow-list set by `CORS_ALLOWED_ORIGINS`, with credentials. |
| Input validation | Bean Validation on every request body, with field-level errors in RFC 7807 responses. Filters use bound parameters, never client text spliced into SQL. Sorting accepts only entity property names, so unknown fields get 400, and the organisation directory uses its own allow-listed `order` values. Page size is capped at 200. [HardeningTest] |
| Output safety | The web app never renders untrusted HTML, and external application links are validated (`src/lib/safe-url.ts`). CSV exports neutralise spreadsheet formulas. |
| Uploads | PDF, Word, PNG and JPEG only, at most 10 MB. The file's **leading bytes must match its declared type**, so a script renamed `cv.pdf` is refused. Files are stored under random server-side names (no path traversal). Downloads are always `attachment`, with the file name RFC 6266-encoded. [UploadSafetyTest] |
| Listing attachments | Up to 5 per listing, managed only by the listing's owners or moderators. Downloadable by anyone once the listing is published, and hidden (404) before that. [ListingSafeguardsTest] |
| Payment webhooks | HMAC-SHA256 signature, and de-duplication by provider event ID. Repeated bad signatures alert administrators. [PaymentWebhookTest, HardeningTest] |
| Errors | RFC 7807 bodies with a `requestId`. Stack traces and secrets are never returned. |

## Audit and monitoring

- Privileged actions write an audit event with actor, action, entity, summary, **correlation ID, IP address and user agent**. [HardeningTest]
- Every request has an `X-Request-Id` that appears in the logs and on audit events.
- Administrators are alerted to:
  - account lockouts
  - privilege changes
  - unusual export volume
  - rejected payment webhooks
  - failed nightly backups

## Privacy (Zambia Data Protection Act, 2021)

- **Consent history:** each opt-in or opt-out (terms, privacy, job alerts, service updates) is recorded with its source, including email unsubscribe links. [AccountSecurityAndHistoryTest, UnsubscribeTest]
- **Receipts:** a receipt for a paid invoice is visible only to its customer and finance staff. [ReceiptTest]
- **Access and portability:** candidates can download their data.
- **Erasure:** a deletion request closes the account at once. Personal data is anonymised after a configurable grace period, and records that must be kept (applications, payments, consent evidence) are anonymised rather than deleted. [SecurityOperationsTest]
- **Retention:** a daily job removes old sessions and tokens, sent-email records after 90 days, read notifications after a year, and export files after 7 days.
- **Exports:** exports mask contact details and are recorded in the audit log.
- **Reporting:** reports never break candidates down by personal characteristics.
- **Fairness:** recruitment scorecards score job-related criteria only, with guidance against protected characteristics, and every hiring decision is made by a person.

## Secrets

Secrets are only ever supplied through environment variables (see `.env.example`); none are committed. In production, set:
- `JWT_SECRET`
- `EOZ_DATA_KEY`
- `PAYMENT_WEBHOOK_SECRET`
- `DB_PASSWORD`
- SMTP credentials

Change the seeded `admin@eoz.zm` password before the system is reachable by anyone else. See `docs/operations.md` for rotation and incident response.
