.PHONY: development-setup up down logs-backend logs-frontend migrate migrate-reset build build-backend build-frontend update-backend update-frontend clean test test-backend test-frontend test-e2e

ENV_FILE := $(if $(wildcard .env),--env-file .env,)
DC := docker compose $(ENV_FILE)

# ── Main entry point ──────────────────────────────────────────────────────────
development-setup:
	@echo "[1/4] Building images..."
	$(DC) build
	@echo "[2/4] Starting postgres..."
	$(DC) up -d postgres
	@echo "[3/4] Waiting for postgres to be healthy..."
	@until $(DC) exec postgres pg_isready -U $${POSTGRES_USER:-hwuser} -d $${POSTGRES_DB:-hwdb} > /dev/null 2>&1; do \
		echo "  postgres not ready, retrying..."; \
		sleep 2; \
	done
	@echo "[3/4] Postgres healthy. Running migrations..."
	$(DC) run --rm backend npm run migrate
	@echo "[4/4] Starting backend and frontend..."
	$(DC) up -d backend frontend
	@echo ""
	@echo "Done."
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:4000"

# ── Helpers ───────────────────────────────────────────────────────────────────
up:
	$(DC) up -d

down:
	$(DC) down

build:
	$(DC) build

build-backend:
	$(DC) build backend

build-frontend:
	$(DC) build frontend

update-backend:
	$(DC) build backend
	$(DC) up -d --no-deps backend

update-frontend:
	$(DC) build frontend
	$(DC) up -d --no-deps frontend

migrate:
	$(DC) run --rm backend npm run migrate

migrate-reset:
	@echo "Resetting database schema..."
	$(DC) up -d postgres
	@until $(DC) exec postgres pg_isready -U $${POSTGRES_USER:-hwuser} -d $${POSTGRES_DB:-hwdb} > /dev/null 2>&1; do \
		echo "  postgres not ready, retrying..."; \
		sleep 2; \
	done
	$(DC) exec postgres psql -U $${POSTGRES_USER:-hwuser} -d $${POSTGRES_DB:-hwdb} -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
	@echo "Re-running migrations..."
	$(DC) run --rm backend npm run migrate

logs-backend:
	$(DC) logs -f backend

logs-frontend:
	$(DC) logs -f frontend

clean:
	$(DC) down -v --remove-orphans

test: test-backend test-frontend

test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npm test

# Requires `make up` first
test-e2e:
	npx playwright test
