# Frontend (WalletLedger Consumer Console)

This frontend is a standalone React + TypeScript app that acts as a consumer of the WalletLedger backend APIs.

It was added to explore how extendable the backend is when integrated with a real consumer-facing client, including auth, account operations, transfer workflows, dead-letter recovery, and metrics visibility.

## Why this frontend exists

- Validate backend API usability from a consumer integration perspective.
- Exercise all exposed backend routes through a responsive UI.
- Provide a concrete baseline for future consumer apps (web/mobile/internal tools).

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui-style component primitives
- Zustand for session/client state
- Axios for API integration
- Sonner for toast notifications

## Routes (authenticated shell)

| Path | Screen |
|------|--------|
| `/` | Overview — health check + quick links |
| `/accounts` | Accounts — list/create, balance, ledger, add funds |
| `/transfers` | Transfers — create transfer, lookup status |
| `/operations` | Dead-letter list + retry |
| `/metrics` | Metrics snapshot |
| `/audit` | Audit-style timeline (ledger + dead-letter; no dedicated audit API) |
| `/profile` | JWT profile refresh + API key storage |

Public: `/login`, `/register`.

## Backend coverage

The UI covers all major backend capabilities:

- System:
  - `GET /api/health`
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/user`
- Accounts:
  - `GET /api/accounts`
  - `POST /api/accounts`
  - `GET /api/accounts/:id/balance`
  - `GET /api/accounts/:id/transactions`
  - `POST /api/accounts/:id/funds` (with `Idempotency-Key`)
- Transfers:
  - `POST /api/transfers` (with `Idempotency-Key`)
  - `GET /api/transfers/:id`
- Operations:
  - `GET /api/transfers/dead-letter`
  - `POST /api/transfers/:id/retry`
  - `GET /api/metrics`

## API auth model used by the frontend

- JWT is stored client-side and sent as `Authorization: Bearer <token>`.
- API key is sent as `x-api-key` for protected account/transfer/metrics endpoints.
- Write operations generate/send `Idempotency-Key` for safe retries.

## Local development

From this `frontend` directory:

```bash
npm install
npm run dev
```

Default app URL: `http://localhost:5173`

## Build

```bash
npm run build
```

## Notes

- This app is intentionally implementation-focused and API-driven, designed to stress backend integration paths.
- It is a strong starting point for evolving into richer consumer experiences while keeping backend contracts stable.
