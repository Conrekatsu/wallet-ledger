# AI_USAGE.md

## Entry 1: Initial Project Scaffold

### Prompts used
```
Set up a Vite-based full-stack starter project.
Structure: use Docker to run all services and add a Makefile command `make development-setup` to build and start frontend + backend and run DB migrations.
Backend: Node.js (Express) + PostgreSQL, JWT auth scaffold with bcrypt, TypeScript.
Frontend: React + TypeScript.
Testing: include baseline e2e and unit tests for the initial setup.
```

### Where AI helped
- Generated monorepo structure with frontend, backend, Docker, and Makefile automation.
- Added backend auth scaffold and database migration flow.
- Added initial test setup for e2e and unit coverage.

### What I verified or modified
- Reviewed generated setup and refined wording in this log entry for clarity.

## Entry 2: Backend Flow Test Generation

### Prompts used
```create a test for backend flows```

### Where AI helped
- Created tests for each backend flow (auth, account, and transfer).
- Added route-driven test files for account and transfer flows:
  - backend/src/__tests__/account.routes.test.ts
  - backend/src/__tests__/transaction.routes.test.ts

### What I verified or modified
- Verified generated flow tests by running backend tests (all passing).

## Entry 3: Move to Integration-Test Style

### Prompts used
```
change backend tests to be more of an integration_test style instead of separate handler/controller unit files
```

### Where AI helped
- Reworked tests to follow route -> handler -> controller execution.
- Consolidated coverage into route-level suites using supertest.

### What I verified or modified
- Reduced split per-layer test files and focused on request/response behavior.


