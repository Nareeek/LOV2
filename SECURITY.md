# Security Baseline

LOV2 treats the server as authoritative for game economy, combat, rewards, character progression, and payments.

## Implemented Defaults

- Passwords use Argon2id.
- Sessions are stored server-side and sent as HttpOnly cookies.
- Unsafe browser requests require a CSRF token issued by `/auth/csrf`.
- Helmet, CORS credentials allow-listing, and API rate limiting are enabled.
- DTO validation rejects unknown input fields.
- Combat rewards, item drops, currency changes, and stat changes are computed by API command handlers.
- Payment webhook events are idempotent.
- Currency changes are mirrored into ledger rows.
- Docker services isolate web, API, worker, PostgreSQL, and Redis.

## Before Live Payments

- Replace all placeholder secrets in `.env`.
- Confirm Stripe live webhook signature verification in a public HTTPS environment.
- Add refund, fraud, chargeback, support, and tax handling.
- Run dependency audit, CodeQL, API integration tests, and Playwright E2E.
- Review against OWASP ASVS controls for auth, session management, validation, logging, and secrets.
