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
command -v node >/dev/null || fail "Falta node. Instálalo con: brew install node"
command -v npm  >/dev/null || fail "Falta npm (viene con node)."

# Next.js 15 necesita Node 18.18 o superior.
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit((a>18||(a===18&&b>=18))?0:1)' \
  || fail "Next.js 15 necesita Node 18.18 o superior (tienes $(node -v)). Actualiza con: brew upgrade node"

# Las versiones fijadas en requirements.txt (pydantic, psycopg2-binary,
# cryptography) solo publican ruedas precompiladas hasta Python 3.13. Con 3.14
# pip intenta compilarlas desde el código fuente y pide pg_config y Rust, así
# que buscamos un intérprete dentro del rango soportado en vez de usar el que
# esté primero en el PATH.
PY_MIN_MINOR=10
PY_MAX_MINOR=13

supported_python() {
  "$1" -c "import sys; sys.exit(0 if (3, $PY_MIN_MINOR) <= sys.version_info[:2] <= (3, $PY_MAX_MINOR) else 1)" \
    >/dev/null 2>&1
}

PY_BIN=""
for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" >/dev/null 2>&1 && supported_python "$candidate"; then
    PY_BIN="$(command -v "$candidate")"
    break
  fi
done

if [ -z "$PY_BIN" ]; then
  found="ninguno"
  if command -v python3 >/dev/null 2>&1; then
    found="$(python3 -V 2>&1)"
  fi
  fail "Necesito Python entre 3.$PY_MIN_MINOR y 3.$PY_MAX_MINOR y aquí tienes $found.
  Instala uno compatible con:  brew install python@3.12
  (puedes conservar el que ya tienes; este script usará el 3.12 solo para esta app).
  Alternativa sin instalar nada: docker compose up --build"
fi

info "Usando $($PY_BIN -V) desde $PY_BIN"

# --- Puertos libres ---------------------------------------------------------
# Intentamos conectar en vez de mirar `lsof`: si algo responde, el puerto está
# ocupado, y esto funciona igual aunque lsof no esté disponible.
port_busy() {
  "$PY_BIN" - "$1" <<'PY'
import socket, sys
sock = socket.socket()
sock.settimeout(0.5)
try:
    sock.connect(("127.0.0.1", int(sys.argv[1])))
except OSError:
    sys.exit(1)
finally:
    sock.close()
sys.exit(0)
PY
}

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if port_busy "$port"; then
    fail "El puerto $port ya está ocupado. Libéralo con:  lsof -ti tcp:$port | xargs kill
  O arranca en otros puertos:  FRONTEND_PORT=3001 BACKEND_PORT=8001 ./start-mac.sh"
  fi
done

# --- Backend: venv + dependencias ------------------------------------------
# Un intento anterior que falló a mitad deja un venv que existe pero no sirve,
# así que comprobamos que de verdad arranca antes de darlo por bueno.
VENV_PY="$BACKEND/.venv/bin/python"

venv_usable() {
  [ -x "$VENV_PY" ] || return 1
  supported_python "$VENV_PY" || return 1
  "$VENV_PY" -c 'import fastapi, uvicorn, alembic, sqlalchemy, pydantic' >/dev/null 2>&1
}

if venv_usable; then
  info "Entorno virtual de Python listo."
else
  if [ -d "$BACKEND/.venv" ]; then
    info "El entorno virtual está incompleto o usa una versión no soportada; lo recreo..."
    rm -rf "$BACKEND/.venv"
  fi
  info "Creando entorno virtual de Python e instalando dependencias (unos minutos)..."
  "$PY_BIN" -m venv "$BACKEND/.venv"
  "$VENV_PY" -m pip install --upgrade pip --quiet
  "$VENV_PY" -m pip install -r "$BACKEND/requirements.txt" \
    || fail "Falló la instalación de dependencias de Python. La salida de pip está arriba."
  venv_usable || fail "Las dependencias se instalaron pero el entorno sigue sin poder importarlas."
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
# CORS_ORIGINS tiene que seguir al puerto elegido: el backend solo acepta
# peticiones del origen exacto, así que con FRONTEND_PORT distinto de 3000 el
# login fallaría por CORS si dejáramos el valor por defecto.
(cd "$BACKEND" && PYTHONPATH=. AI_PROVIDER="${AI_PROVIDER:-mock}" \
  CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:$FRONTEND_PORT}" \
  ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload) &
PIDS+=($!)

# Espera a que un servidor responda; falla si se cayó al arrancar en vez de
# anunciar que todo está listo cuando no lo está.
wait_for() {
  name="$1"; url="$2"; pid="$3"; tries="$4"
  while [ "$tries" -gt 0 ]; do
    if curl -fsS -m 2 "$url" >/dev/null 2>&1; then
      info "$name listo."
      return 0
    fi
    kill -0 "$pid" 2>/dev/null || fail "$name se cerró al arrancar. Revisa el error de arriba."
    tries=$((tries - 1))
    sleep 1
  done
  fail "$name no respondió a tiempo en $url."
}

wait_for "Backend" "http://127.0.0.1:$BACKEND_PORT/health" "${PIDS[0]}" 60

info "Arrancando frontend en http://localhost:$FRONTEND_PORT ..."
(cd "$FRONTEND" && NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT" \
  npm run dev -- --port "$FRONTEND_PORT") &
PIDS+=($!)

wait_for "Frontend" "http://127.0.0.1:$FRONTEND_PORT/" "${PIDS[1]}" 120

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
