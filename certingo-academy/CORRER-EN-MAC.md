# Cómo ver la página en tu Mac

## Opción rápida (recomendada) — un solo comando

Abre la app **Terminal** en tu Mac y pega esto línea por línea:

```bash
git clone https://github.com/emmanuelnavaromero02-commits/LEON.git
cd LEON/certingo-academy
git checkout claude/local-page-mac-8fh3ug
./start-mac.sh
```

> Si ya tienes el repo clonado, solo entra a la carpeta y haz
> `git pull && git checkout claude/local-page-mac-8fh3ug && ./start-mac.sh`

Cuando el terminal muestre `Certingo Academy corriendo`, abre el navegador en:

**http://localhost:3000**

Para detener todo: pulsa `Ctrl + C` en el terminal.

---

## Qué necesitas instalado

- **Python entre 3.10 y 3.13** — no 3.14, mira la nota de abajo
- **Node.js 18.18 o superior** (probado con Node 22)

El script comprueba ambas cosas antes de instalar nada y te dice qué falta.

```bash
# Si no tienes Homebrew:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install python@3.12 node
```

### Por qué Python 3.14 no sirve (todavía)

Las versiones que fija `backend/requirements.txt` —`psycopg2-binary`, `pydantic`,
`cryptography`— solo publican paquetes precompilados hasta Python 3.13. Con 3.14
pip intenta compilarlos desde el código fuente y falla pidiendo `pg_config` (el
ejecutable de PostgreSQL) y el compilador de Rust.

**No hace falta desinstalar tu Python 3.14.** Instala uno compatible junto a él y
el script lo detecta y lo usa solo para esta app:

```bash
brew install python@3.12
```

El script busca `python3.13`, `python3.12`, `python3.11` y `python3.10` en ese
orden, y solo cae en `python3` si su versión está dentro del rango.

La primera vez el script tarda unos minutos instalando dependencias. Las
siguientes veces arranca en segundos.

---

## Direcciones útiles

| Qué | URL |
|---|---|
| Página principal | http://localhost:3000 |
| Panel de estudiante | http://localhost:3000/dashboard |
| Consola de admin | http://localhost:3000/admin/control-room |
| API backend | http://localhost:8000 |
| Documentación de la API | http://localhost:8000/docs |

## Cuentas demo

| Rol | Email | Contraseña |
|---|---|---|
| Super admin | `superadmin@certingo.demo` | `superadmin123` |
| Admin | `admin@certingo.demo` | `admin123` |
| Estudiante | `student@certingo.demo` | `student123` |

---

## Si algo falla

**«El puerto 3000 ya está ocupado»**

```bash
lsof -ti tcp:3000 | xargs kill
lsof -ti tcp:8000 | xargs kill
```

O usa otros puertos (el script ajusta el CORS del backend solo):

```bash
FRONTEND_PORT=3001 BACKEND_PORT=8001 ./start-mac.sh
```

**«pg_config executable not found» al instalar**

Tu `python3` es 3.14 y pip está intentando compilar `psycopg2` desde el código
fuente. Instala una versión compatible y vuelve a lanzar el script; él la
detecta y recrea el entorno solo:

```bash
brew install python@3.12
./start-mac.sh
```

**La instalación falló a medias y ahora no arranca**

El script detecta un entorno virtual incompleto y lo rehace por su cuenta. Si
quieres forzarlo:

```bash
rm -rf backend/.venv
./start-mac.sh
```

**«permission denied: ./start-mac.sh»**

```bash
chmod +x start-mac.sh
```

**Empezar de cero con la base de datos**

```bash
rm -f backend/certingo.db
./start-mac.sh
```

---

## Alternativa con Docker

Si prefieres Docker Desktop en vez de instalar Python y Node:

```bash
cd certingo-academy
docker compose up --build
```

Levanta Postgres + backend + frontend. La página queda igual en
http://localhost:3000.
