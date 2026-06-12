# Certingo Academy (Enterprise Edition)

Certingo is a multi-tenant, AI-native adaptive learning platform designed for professional certification preparation. It functions as a "Duolingo for Certifications," adapting pedagogical depth based on student profiles.

## 🚀 Key Production Features

### Student Experience
- **Adaptive Learning Engine**: Real-time mastery calculation using difficulty-weighted scoring.
- **Onboarding & Diagnostic**: Multi-step personalization that sets initial skill maps.
- **Dynamic Dashboard**: Readiness score visualization with "Next Best Action" AI recommendations.
- **Pedagogical Runner**: Lessons generated via RAG, incorporating analogies and core concepts.
- **Retention Suite**: Mistakes Notebook using spaced repetition patterns and detailed analytics.

### Enterprise Admin & Infrastructure
- **Multi-Tenancy**: 100% data isolation across all database entities.
- **Secure Vault**: AES-256 (Fernet) encrypted storage for AI provider keys.
- **Control Room**: Operational telemetry including latency, worker load, and audit traces.
- **Marketplace**: Pluggable "Certification Packs" (AWS, Azure, GCP, SAP, Salesforce).
- **AI Studio**: Prompt engineering sandbox with Zod-validation and RAG context preview.
- **MCP Registry**: Integration with Model Context Protocol for external documentation indexing.

## 🛠 Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Framer Motion, Lucide.
- **Backend**: FastAPI, SQLAlchemy (SQLite), Pydantic v2.
- **Intelligence**: OpenAI/Anthropic decoupled providers with Mock fallback.

## 📖 Quick Start

1. **Install Dependencies**:
   ```bash
   cd certingo-academy/backend && pip install -r requirements.txt
   cd ../frontend && npm install
   ```

2. **Initialize Database**:
   ```bash
   cd certingo-academy/backend && python3 -m app.database.seed
   ```

3. **Launch Services**:
   - Backend: `uvicorn app.main:app --port 8000`
   - Frontend: `npm run dev`

4. **Install Content**:
   ```bash
   curl -X POST http://localhost:8000/api/admin/marketplace/packs/import -d '{"pack_id": "aws-cloud-practitioner"}'
   ```

## 🛡 Security & Resilience
- **Audit Logs**: Immutable history of all administrative actions.
- **Error Boundaries**: Global frontend resilience.
- **Validation**: Strict Pydantic schemas and Zod output verification.
