# ---------------------------------------------------------------------------
# Certingo Academy backend image (FastAPI + gunicorn/uvicorn).
#
# Multi-stage:
#   builder  -> installs pinned dependencies into an isolated virtualenv.
#   runtime  -> slim image with only the venv + application code, non-root.
# ---------------------------------------------------------------------------

# ------------------------------- builder -----------------------------------
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Build dependencies. psycopg2-binary ships manylinux wheels, but build-essential
# keeps things robust if a source build is ever required.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create an isolated virtualenv that we copy verbatim into the runtime stage.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# ------------------------------- runtime -----------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

# curl is used by the container healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app

# Bring the pre-built virtualenv across from the builder stage.
COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# Application source. The .dockerignore guarantees .venv, *.db, .field_key,
# tests and caches are excluded from this copy.
COPY --chown=app:app . /app

# Ensure the entrypoint is executable.
RUN chmod +x /app/entrypoint.sh

USER app

EXPOSE 8000

# Container-level healthcheck against the FastAPI /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/health" || exit 1

# entrypoint.sh runs migrations (+ optional seed) and then execs gunicorn.
ENTRYPOINT ["/app/entrypoint.sh"]
