# Virtual Classroom API

The backend is a TypeScript/Express service backed by PostgreSQL. It provides public catalogue data and secure student/administrator authentication.

## Local setup

1. Copy `.env.example` to `.env` and replace the database credentials and `AUTH_OTP_PEPPER`.
2. Create a PostgreSQL database and a least-privilege application user.
3. Run `npm run db:migrate`.
4. Start the API with `npm run dev:api`.
5. Start the web application with `npm run dev:web`.

The default API address is `http://127.0.0.1:8787/api/v1`. In local console-email mode, registration codes are printed only in the API terminal. Production refuses to start unless SMTP mode is configured.

## Authentication

Student registration is a two-step flow. `register/start` validates the complete profile, hashes the password with Argon2id, stores a hashed one-time code, and sends the code. `register/verify` activates the account and creates an opaque session. Login uses the same session mechanism.

Session tokens are random, stored only as SHA-256 hashes in PostgreSQL, and sent to browsers in HttpOnly, SameSite=Lax cookies. Production cookies also use `Secure` and the `__Host-` prefix. Authentication endpoints are origin-checked and rate-limited. Role checks happen on the server; client-supplied user IDs are never trusted.

Create or rotate an administrator account without storing its password in the repository:

```powershell
$env:ADMIN_EMAIL='admin@example.com'
$env:ADMIN_NAME='Administrator Name'
$env:ADMIN_PASSWORD='use-a-long-unique-password'
npm run admin:create
```

The password must contain at least 14 characters. The command refuses to convert an existing student account into an administrator.

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/settings/public`
- `GET /api/v1/modules`
- `POST /api/v1/auth/register/start`
- `POST /api/v1/auth/register/verify`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/admin/dashboard`
- `PATCH /api/v1/admin/settings/guest-login`
- `POST /api/v1/admin/modules`
- `PATCH /api/v1/admin/modules/:code`
- `DELETE /api/v1/admin/modules/:code`

Administrator endpoints require a live administrator session. The dashboard query uses bounded cursor pagination for students. Guest-access and module mutations are transactional and write an `audit_events` row with the same commit. Deleting a module archives it; Module A is protected from archival.

Cloud progress synchronization, password recovery, student-account administration actions, and audit-management screens remain later milestones.

## Verification commands

```powershell
npm run check
npm test
npm run build
```