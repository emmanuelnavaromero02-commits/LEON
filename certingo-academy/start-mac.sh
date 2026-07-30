#!/usr/bin/env bash
# ============================================================================
# Certingo Academy — arranque local en Mac con un solo comando.
#
#   ./start-mac.sh
#
# Instala dependencias (solo la primera vez), aplica migraciones, siembra los
# datos demo y levanta backend (:8000) + frontend (:3000). Ctrl+C detiene todo.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

info() { printf "\033[36m==>\033[0m %s\n" "$1"; }
fail() { printf "\033[31mError:\033[0m %s\n" "$1" >&2; exit 1; }

# --- Requisitos -------------------------------------------------------------
command -v python3 >/dev/null || fail "Falta python3. Instálalo con: brew install python@3.11"
command -v node    >/dev/null || fail "Falta node. Instálalo con: brew install node"
command -v npm     >/dev/null || fail "Falta npm (viene con node)."

PY_OK=$(python3 -c 'import sys; print(1 if sys.version_info[:2] >= (3, 10) else 0)')
[ "$PY_OK" = "1" ] || fail "Se necesita Python 3.10 o superior (tienes $(python3 -V))."

# --- Puertos libres ---------------------------------------------------------
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    fail "El puerto $port ya está ocupado. Libéralo con: lsof -ti tcp:$port | xargs kill"
  fi
done

# --- Backend: venv + dependencias ------------------------------------------
if [ ! -x "$BACKEND/.venv/bin/python" ]; then
  info "Creando entorno virtual de Python (solo la primera vez)..."
  python3 -m venv "$BACKEND/.venv"
  "$BACKEND/.venv/bin/pip" install --upgrade pip --quiet
  "$BACKEND/.venv/bin/pip" install -r "$BACKEND/requirements.txt" --quiet
else
  info "Entorno virtual de Python ya existe."
fi

# --- Frontend: node_modules -------------------------------------------------
if [ ! -d "$FRONTEND/node_modules" ]; then
  info "Instalando dependencias de Node (solo la primera vez)..."
  (cd "$FRONTEND" && npm install --no-audit --no-fund)
else
  info "Dependencias de Node ya instaladas."
fi

# --- Base de datos: migraciones + datos demo --------------------------------
info "Aplicando migraciones de base de datos..."
(cd "$BACKEND" && PYTHONPATH=. ./.venv/bin/alembic upgrade head >/dev/null)

info "Sembrando datos demo..."
(cd "$BACKEND" && PYTHONPATH=. ./.venv/bin/python -m app.database.seed)

# --- Arranque ---------------------------------------------------------------
PIDS=()
cleanup() {
  echo
  info "Deteniendo servidores..."
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

info "Arrancando backend en http://localhost:$BACKEND_PORT ..."
(cd "$BACKEND" && PYTHONPATH=. AI_PROVIDER="${AI_PROVIDER:-mock}" \
  ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload) &
PIDS+=($!)

# Espera a que el backend responda antes de levantar el frontend.
for _ in $(seq 1 40); do
  if curl -fsS -m 2 "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
    info "Backend listo."
    break
  fi
  sleep 1
done

info "Arrancando frontend en http://localhost:$FRONTEND_PORT ..."
(cd "$FRONTEND" && NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT" \
  npm run dev -- --port "$FRONTEND_PORT") &
PIDS+=($!)

cat <<EOF

------------------------------------------------------------------
  Certingo Academy corriendo

  Página:        http://localhost:$FRONTEND_PORT
  API backend:   http://localhost:$BACKEND_PORT
  Docs API:      http://localhost:$BACKEND_PORT/docs

  Cuentas demo:
    superadmin@certingo.demo / superadmin123
    admin@certingo.demo      / admin123
    student@certingo.demo    / student123

  Pulsa Ctrl+C para detener todo.
------------------------------------------------------------------

EOF

wait
