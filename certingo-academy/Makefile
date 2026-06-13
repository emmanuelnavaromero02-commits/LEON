# ============================================================================
# Certingo Academy — developer task runner.
# Run from the project root (certingo-academy/). The backend virtualenv is
# expected at backend/.venv (created by `make setup`).
# ============================================================================

# Paths
BACKEND      := backend
FRONTEND     := frontend
VENV         := $(BACKEND)/.venv
PY           := $(VENV)/bin/python
PIP          := $(VENV)/bin/pip
UVICORN      := $(VENV)/bin/uvicorn
ALEMBIC      := $(VENV)/bin/alembic
RUFF         := $(VENV)/bin/ruff
PYTEST       := $(VENV)/bin/pytest

# docker compose v2 (plugin) by default.
COMPOSE      := docker compose

.PHONY: help setup up down build dev backend frontend \
        test test-backend lint fmt migrate seed reset-db

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- Setup ------------------------------------------------------------------
setup: ## Create the backend venv (+dev deps) and install frontend packages.
	cd $(BACKEND) && python3 -m venv .venv && \
		./.venv/bin/pip install --upgrade pip && \
		./.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
	cd $(FRONTEND) && npm install

# --- Docker -----------------------------------------------------------------
up: ## Build (if needed) and start the full stack via docker compose.
	$(COMPOSE) up --build

down: ## Stop the stack and remove containers (keeps the db volume).
	$(COMPOSE) down

build: ## Build the backend and frontend docker images.
	$(COMPOSE) build

# --- Local dev (no Docker) --------------------------------------------------
dev: ## Run backend and frontend dev servers together.
	$(MAKE) backend & $(MAKE) frontend

backend: ## Run the FastAPI dev server (uvicorn, reload).
	cd $(BACKEND) && PYTHONPATH=. AI_PROVIDER=mock \
		.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

frontend: ## Run the Next.js dev server.
	cd $(FRONTEND) && npm run dev

# --- Quality ----------------------------------------------------------------
test: test-backend ## Alias for the backend test suite.

test-backend: ## Run the backend pytest suite.
	cd $(BACKEND) && .venv/bin/pytest

lint: ## Lint the backend with ruff.
	cd $(BACKEND) && .venv/bin/ruff check .

fmt: ## Auto-fix lint issues + format the backend with ruff.
	cd $(BACKEND) && .venv/bin/ruff check . --fix && .venv/bin/ruff format .

# --- Database ---------------------------------------------------------------
migrate: ## Apply all alembic migrations (alembic upgrade head).
	cd $(BACKEND) && .venv/bin/alembic upgrade head

seed: ## Run the idempotent database seed.
	cd $(BACKEND) && PYTHONPATH=. .venv/bin/python -m app.database.seed

reset-db: ## Delete the local SQLite db and re-seed.
	rm -f $(BACKEND)/certingo.db
	$(MAKE) migrate
	$(MAKE) seed
