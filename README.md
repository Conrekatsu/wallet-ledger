# WalletLedger

Wallet-style ledger service with user auth, account funding, and idempotent transfers.

Tech stack: React + Express + PostgreSQL, containerized with Docker Compose.

## Features

- User registration/login with JWT
- API key authentication for account and transfer endpoints (`x-api-key`)
- Create accounts and query balances
- Add funds to an account (idempotent via `Idempotency-Key`)
- Create transfers between accounts (idempotent via `Idempotency-Key`)
- Transfer status lookup and audit logging
- Account ledger history endpoint
- Background transfer worker with retry/backoff and stuck-job recovery
- Dead-letter inspection/retry endpoints for failed transfers
- Global and write-endpoint rate limiting

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Zustand, Axios |
| Backend | Node.js, Express, TypeScript, JWT, bcrypt |
| Database | PostgreSQL 16 |
| Infra | Docker Compose, Make |
| Testing | Jest (backend), Vitest (frontend), Playwright (e2e) |

## Quick Start

### Prerequisites

- Docker Desktop (Docker Compose enabled)
- GNU Make (`make`)
- Node.js 20+ (recommended for local tooling and tests)

### Setup and run

```bash
cp .env.example .env
make development-setup
```

Services:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000/api |
| Health | http://localhost:4000/api/health |
| Postgres | localhost:5432 |

## Common Commands

```bash
make up               # start all containers (detached)
make down             # stop all containers
make build            # rebuild all images
make build-backend    # rebuild backend image
make build-frontend   # rebuild frontend image
make update-backend   # rebuild + restart backend only
make update-frontend  # rebuild + restart frontend only
make migrate          # run DB migrations
make migrate-reset    # reset schema and re-run migrations
make logs-backend     # stream backend logs
make logs-frontend    # stream frontend logs
make clean            # teardown + remove volumes
```

## API Overview

Public endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`

Protected endpoint (JWT bearer token):

- `GET /api/auth/user`

API-key endpoints (must include `x-api-key`):

- `POST /api/accounts`
- `GET /api/accounts/:id/balance`
- `GET /api/accounts/:id/transactions`
- `POST /api/accounts/:id/funds` (`Idempotency-Key` required)
- `POST /api/transfers` (`Idempotency-Key` required)
- `GET /api/transfers/:id`
- `GET /api/transfers/dead-letter`
- `POST /api/transfers/:id/retry`
- `GET /api/metrics`

## Auth + API Key Flow

1. Register or login through `/api/auth/*` and receive JWT + user data.
2. Use JWT for frontend session (`Authorization: Bearer <token>`).
3. For account/transfer APIs, send the user API key in `x-api-key`.
4. For add-funds and transfer creation, send `Idempotency-Key` to safely retry.

## Running API + Worker

- API and worker run in the same backend process.
- Start backend (and worker) with:

```bash
make up
```

or locally:

```bash
cd backend
npm run dev
```

The transfer worker starts automatically when backend starts.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `POSTGRES_USER` | DB username | `hwuser` |
| `POSTGRES_PASSWORD` | DB password | `hwpassword` |
| `POSTGRES_DB` | DB name | `hwdb` |
| `JWT_SECRET` | Secret for signing JWTs | `changeme_in_production` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `VITE_API_URL` | Frontend API URL for prod builds | `http://localhost:4000/api` |
| `TRANSFER_WORKER_POLL_MS` | Worker polling interval | `1000` |
| `PROCESSING_STUCK_THRESHOLD_MS` | Stuck-processing reclaim threshold | `60000` |
| `SIMULATE_FAILURES` | Enable random simulated worker failures | `false` |
| `SIMULATE_FAILURE_RATE` | Chance any claimed job fails when simulation is on | `0.2` |
| `SIMULATE_FAILURE_TERMINAL_RATE` | Portion of simulated failures that are terminal | `0.2` |
| `RATE_LIMIT_GLOBAL_WINDOW_MS` | Global rate limit window | `60000` |
| `RATE_LIMIT_GLOBAL_MAX` | Max requests per global window | `120` |
| `RATE_LIMIT_WRITE_WINDOW_MS` | Write endpoint rate limit window | `60000` |
| `RATE_LIMIT_WRITE_MAX` | Max write requests per window | `30` |

In development, frontend `/api/*` requests are proxied to `http://backend:4000`.

## Testing

```bash
# all unit/integration tests
npm test

# e2e tests (requires running app, e.g. `make up`)
npm run test:e2e
```

You can also run make targets:

```bash
make test
make test-backend
make test-frontend
make test-e2e
```

## API Client Collection

Bruno requests are available in `bruno/WalletLedger Backend` for quick manual testing:

- Health, register, login, me
- Create accounts
- Add funds
- Create/replay transfer
- Check transfer status

## Sample API Requests

```bash
# add funds to an account
curl -X POST http://localhost:4000/api/accounts/<account_id>/funds \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your_api_key>" \
  -H "Idempotency-Key: funds-001" \
  -d '{"amount":100}'

# create transfer (queue-first, returns PENDING/PROCESSING/...)
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your_api_key>" \
  -H "Idempotency-Key: transfer-001" \
  -d '{"fromAccountId":"<from_account_id>","toAccountId":"<to_account_id>","amount":50}'

# duplicate request with same idempotency key (returns existing transfer)
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your_api_key>" \
  -H "Idempotency-Key: transfer-001" \
  -d '{"fromAccountId":"<from_account_id>","toAccountId":"<to_account_id>","amount":50}'

# transfer status
curl http://localhost:4000/api/transfers/<transfer_id> \
  -H "x-api-key: <your_api_key>"

# list dead-letter transfers (failed transfers)
curl http://localhost:4000/api/transfers/dead-letter \
  -H "x-api-key: <your_api_key>"

# retry a dead-letter transfer
curl -X POST http://localhost:4000/api/transfers/<transfer_id>/retry \
  -H "x-api-key: <your_api_key>"

# account ledger history
curl http://localhost:4000/api/accounts/<account_id>/transactions \
  -H "x-api-key: <your_api_key>"
```

## Dead Letter Queue (DLQ) Behavior

- This project uses existing `transfers` records with `status=failed` as dead-letter entries.
- A transfer is moved to failed when retries are exhausted or when a terminal error occurs.
- `GET /api/transfers/dead-letter` lists your failed transfers.
- `POST /api/transfers/:id/retry` requeues a failed transfer by setting it back to `pending`.

## Rate Limiting

- Global API limit applies to `/api/*` requests.
- A stricter write limit applies to:
  - `POST /api/accounts/:id/funds`
  - `POST /api/transfers`
  - `POST /api/transfers/:id/retry`
- When limit is exceeded, API returns `429` with:

```json
{ "error": "Too many requests" }
```

## Assumptions

- Monetary values are represented as integer request amounts and stored in Postgres `NUMERIC`.
- A transfer request is accepted quickly and processed asynchronously by the backend worker.
- `Idempotency-Key` is unique per logical operation and reused only for safe retries of the same request.
- API key identity (`x-api-key`) is treated as the trusted caller identity for account/transfer APIs.
- Worker and API share the same database and run in the same backend process by default.

## Trade-offs

- Queue-in-DB design keeps deployment simple, but can be less horizontally scalable than dedicated brokers for very high throughput.
- In-process worker startup is operationally simple, but ties API and worker lifecycles together.
- Polling + row locking (`FOR UPDATE SKIP LOCKED`) is robust and portable, but introduces polling overhead versus push-based queues.
- In-memory metrics are lightweight and easy to add, but reset on process restart and are not a replacement for external telemetry systems.
- Strict idempotency replay behavior improves safety, but requires clients to manage and persist idempotency keys correctly.

