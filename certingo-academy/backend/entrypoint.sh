#!/usr/bin/env bash
#
# Container entrypoint for the Certingo Academy backend.
#
# Responsibilities (in order):
#   1. Apply database migrations (alembic upgrade head).
#   2. Optionally run the idempotent seed when SEED_ON_START=true.
#   3. Exec the application server (gunicorn + uvicorn workers).
#
# Everything is driven by environment variables so the same image works for
# SQLite (dev default) and Postgres (compose / production).
set -euo pipefail

# Number of gunicorn workers (override via WEB_CONCURRENCY).
WORKERS="${WEB_CONCURRENCY:-2}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

echo "[entrypoint] Applying database migrations (alembic upgrade head)..."
alembic upgrade head

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] SEED_ON_START=true -> running database seed (idempotent)..."
  python -m app.database.seed
else
  echo "[entrypoint] SEED_ON_START not 'true' -> skipping seed."
fi

echo "[entrypoint] Starting gunicorn (${WORKERS} uvicorn workers) on ${HOST}:${PORT}..."
exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WORKERS}" \
  --bind "${HOST}:${PORT}" \
  --access-logfile - \
  --error-logfile - \
  --timeout 120
