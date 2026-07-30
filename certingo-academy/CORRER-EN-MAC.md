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

El script te avisa si falta algo. Para instalarlo:

```bash
# Si no tienes Homebrew:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install python@3.11 node
```

- **Python 3.10 o superior**
- **Node.js 18 o superior** (probado con Node 22)

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

O usa otros puertos:

```bash
FRONTEND_PORT=3001 BACKEND_PORT=8001 ./start-mac.sh
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
