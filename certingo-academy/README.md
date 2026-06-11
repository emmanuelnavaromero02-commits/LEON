# Certingo Academy

Certingo Academy is a multi-tenant, AI-first adaptive learning platform for technical certifications.

## Features
- **Certification Packs**: Installable YAML-based certification roadmaps.
- **Adaptive Engine**: Real-time mastery calculation and balanced diagnostic tests.
- **Enterprise Console**: Operational dashboard for content quality, audit logs, and MCP tool management.
- **Secure Vault**: Encrypted storage for AI provider API keys.
- **RAG-Ready**: Controlled generation using verified knowledge fragments and Learning Bits.

## Quick Start
\`\`\`bash
make setup
make seed
make dev
\`\`\`

Import the demo AWS pack:
\`\`\`bash
curl -X POST http://localhost:8000/api/admin/marketplace/packs/import -H "Content-Type: application/json" -d '{"pack_id": "aws-cloud-practitioner"}'
\`\`\`

## Users
- Admin Console: http://localhost:3000/admin/control-room
- Student Dashboard: http://localhost:3000/dashboard (Log in via onboarding)

## Tech Stack
- Backend: FastAPI, SQLAlchemy, Alembic, SQLite.
- Frontend: Next.js 15, TypeScript, Tailwind CSS, Framer Motion.
- Security: cryptography.Fernet (AES-256).
