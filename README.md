# WalletLedger

Full-stack web app with JWT auth. React + Express + PostgreSQL, fully containerized.
(Ran inside windows WSL)

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 18, TypeScript, Vite, Zustand, Axios |
| Backend  | Node.js, Express, TypeScript, JWT, bcrypt  |
| Database | PostgreSQL 16                              |
| Infra    | Docker Compose                             |

## Quick Start

**Prerequisites:** Docker + Docker Compose + make

```bash
cp .env.example .env        # edit JWT_SECRET before production use
npm install                 # install node_modules
sudo apt install make       # install make
make development-setup      # build images, start DB, run migrations, start all services
```

App is live at:

| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:5173     |
| Backend  | http://localhost:4000/api |
| Postgres | localhost:5432            |

## Common Commands

```bash
make up              # start all containers (detached)
make down            # stop all containers
make build           # rebuild images after Dockerfile changes
make migrate         # re-run DB migrations
make logs-backend    # stream backend logs
make logs-frontend   # stream frontend logs
make clean           # full teardown including volumes
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express app, CORS, route mounting
│   │   ├── routes/auth.ts    # POST /register, POST /login, GET /user
│   │   ├── middleware/auth.ts # JWT verification
│   │   └── db/
│   │       ├── pool.ts       # pg.Pool singleton
│   │       └── migrate.ts    # runs migrations/ in filename order
│   └── migrations/
│       └── 001_init.sql      # users + refresh_tokens tables
└── frontend/
    └── src/
        ├── App.tsx            # PrivateRoute, router
        ├── store/auth.ts      # Zustand store, persisted to localStorage
        ├── lib/api.ts         # Axios instance with auth interceptor
        └── pages/
            ├── LoginPage.tsx
            ├── RegisterPage.tsx
            └── DashboardPage.tsx
```

## Auth Flow

1. User submits form → Axios POST to `/api/login` or `/api/register`
2. Express verifies password with bcrypt → signs JWT (`{ userId, email }`)
3. Frontend stores token in Zustand (persisted to `localStorage` key `hw-auth`)
4. Axios request interceptor attaches `Authorization: Bearer <token>` to all requests
5. Response interceptor calls `logout()` on any 401

## Environment Variables

| Variable            | Description                          | Default                    |
|---------------------|--------------------------------------|----------------------------|
| `POSTGRES_USER`     | DB username                          | `hwuser`                   |
| `POSTGRES_PASSWORD` | DB password                          | `hwpassword`               |
| `POSTGRES_DB`       | DB name                              | `hwdb`                     |
| `JWT_SECRET`        | Secret for signing JWTs              | `changeme_in_production`   |
| `JWT_EXPIRES_IN`    | Token lifetime                       | `7d`                       |
| `VITE_API_URL`      | API base URL for frontend prod builds | `http://localhost:4000/api` |

> **Note:** In dev, Vite proxies `/api/*` to `http://backend:4000` — `VITE_API_URL` is only used in production builds.

## Database Migrations

File-based, no migration library. Files in `backend/migrations/` run in filename order on startup.

Add new migrations as `002_*.sql`, `003_*.sql`, etc.

## Development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev        # ts-node-dev with hot reload on :4000

# Frontend
cd frontend
npm install
npm run dev        # Vite dev server on :5173
npm run lint       # ESLint
npm run build      # tsc + vite build
```

Requires a running PostgreSQL instance and `DATABASE_URL` set in the environment.
