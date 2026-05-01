.PHONY: development-setup up down logs-backend logs-frontend migrate build clean test test-backend test-frontend test-e2e

# ── Main entry point ──────────────────────────────────────────────────────────
development-setup:
	@echo "[1/4] Building images..."
	docker compose build
	@echo "[2/4] Starting postgres..."
	docker compose up -d postgres
	@echo "[3/4] Waiting for postgres to be healthy..."
	@until docker compose exec postgres pg_isready -U $${POSTGRES_USER:-hwuser} -d $${POSTGRES_DB:-hwdb} > /dev/null 2>&1; do \
		echo "  postgres not ready, retrying..."; \
		sleep 2; \
	done
	@echo "[3/4] Postgres healthy. Running migrations..."
	docker compose run --rm backend npm run migrate
	@echo "[4/4] Starting backend and frontend..."
	docker compose up -d backend frontend
	@echo ""
	@echo "Done."
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:4000"

# ── Helpers ───────────────────────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

migrate:
	docker compose run --rm backend npm run migrate

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

clean:
	docker compose down -v --remove-orphans

test: test-backend test-frontend

test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npm test

# Requires `make up` first
test-e2e:
	npx playwright test
