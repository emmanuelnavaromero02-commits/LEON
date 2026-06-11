.PHONY: setup dev backend frontend seed reset-db test smoke demo-check

setup:
	cd certingo-academy/backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
	cd certingo-academy/frontend && npm install

dev:
	make backend & make frontend

backend:
	cd certingo-academy/backend && export PYTHONPATH=$PYTHONPATH:. && AI_PROVIDER=mock ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

frontend:
	cd certingo-academy/frontend && npm run dev

seed:
	cd certingo-academy/backend && export PYTHONPATH=$PYTHONPATH:. && ./venv/bin/python3 -m app.database.seed

reset-db:
	rm -f certingo-academy/backend/certingo.db
	make seed

demo-check:
	./venv/bin/python3 certingo-academy/scripts/preflight.py
