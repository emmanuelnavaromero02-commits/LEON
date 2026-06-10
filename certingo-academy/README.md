# Certingo Academy

Certingo is an AI-powered adaptive learning platform for professional certifications.

## Demo Vision
This demo showcases a multi-tenant, AI-first architecture with a modern SaaS aesthetic (Linear/Vercel style). It features a "Duolingo-like" adaptive engine but for professional technical certifications.

## Project Structure
- `backend/`: FastAPI + SQLAlchemy + SQLite. Multi-tenant ready.
- `frontend/`: Next.js + Tailwind + Framer Motion.
- `content/`: Source knowledge and certification metadata.

## How to Run

### 1. Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate # Or your platform equivalent
pip install -r requirements.txt
python3 -m app.database.seed
uvicorn main:app --reload
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
- Go to `http://localhost:3000`
- Click "Start Demo"
- Complete Onboarding
- Explore the Dashboard, Lessons, and Exam Simulator
- Visit `http://localhost:3000/admin` to see the question review queue

## Multi-tenant Architecture
Every entity in the database is linked to a `tenant_id`. The current demo uses `default-demo-tenant`.

## AI Integration
The demo uses a `MockProvider` by default. The architecture is ready to switch to OpenAI, Anthropic, or MCP by updating `TenantAISettings` and providing API keys in `.env`.
