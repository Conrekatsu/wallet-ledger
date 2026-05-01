# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full environment setup (first time)
make development-setup   # build images, start postgres, run migrations, start all services

# Daily dev
make up                  # start all containers (detached)
make down                # stop all containers
make build               # rebuild images after Dockerfile changes
make migrate             # re-run migrations
make logs-backend        # stream backend logs
make logs-frontend       # stream frontend logs
make clean               # full teardown incl. volumes

# Frontend (inside container or with local Node)
cd frontend && npm run dev       # Vite dev server
cd frontend && npm run lint      # ESLint (src/**/*.{ts,tsx})
cd frontend && npm run build     # tsc + vite build

# Backend (inside container or with local Node)
cd backend && npm run dev        # ts-node-dev with hot reload
cd backend && npm run build      # tsc → dist/
cd backend && npm run migrate    # run migrations manually
```

No test runner is configured in either package.

## URLs

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:5173        |
| Backend   | http://localhost:4000/api    |
| Postgres  | localhost:5432               |

## Architecture

Three-tier monorepo: React frontend → Express backend → PostgreSQL, all containerized.

**Backend** (`backend/src/`):
- `index.ts` — Express app setup, CORS, routes mount
- `routes/auth.ts` — `POST /register`, `POST /login`, `GET /user`
- `middleware/auth.ts` — JWT verification; attaches `req.user = { userId, email }`
- `db/pool.ts` — single `pg.Pool` export used throughout
- `db/migrate.ts` — runs SQL files from `migrations/` in filename order on startup

**Frontend** (`frontend/src/`):
- `store/auth.ts` — Zustand store persisted to localStorage key `hw-auth`; holds `token` + `user`; `logout()` clears both
- `lib/api.ts` — Axios instance; request interceptor injects `Authorization: Bearer <token>`; response interceptor calls `logout()` on 401
- `App.tsx` — `PrivateRoute` checks `useAuthStore.token`; redirects unauthenticated to `/login`
- `pages/` — `LoginPage`, `RegisterPage`, `DashboardPage`

**Auth flow:** form → axios → Express → bcrypt verify → `jwt.sign({ userId, email }, JWT_SECRET)` → frontend stores in Zustand → interceptor attaches to all subsequent requests.

**Vite proxy:** in dev, frontend `/api/*` proxies to `http://backend:4000` (Docker service name), so no CORS issue in development.

## Database

Schema in `backend/migrations/001_init.sql`. Two tables:
- `users` — `id`, `email` (unique), `password` (bcrypt hash), `name`, `created_at`
- `refresh_tokens` — defined but **not yet used** in application code

Migration runner is file-based (no migration library); add new files as `002_*.sql`, `003_*.sql`, etc.

## Environment

Copy `.env.example` → `.env` before first run. Key vars:
- `JWT_SECRET` — required by backend to sign/verify tokens
- `JWT_EXPIRES_IN` — token lifetime (default `7d`)
- `CORS_ORIGIN` — backend CORS whitelist
- `VITE_API_URL` — used in frontend builds (not dev proxy)

## Key Notes

- Backend has no linter configured; frontend uses ESLint 8 with React + TypeScript rules.
- `refresh_tokens` table exists but refresh token rotation is not implemented — `GET /user` is the only protected endpoint.
- TypeScript strict mode on both ends.
