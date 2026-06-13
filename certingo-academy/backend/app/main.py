from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth
from .api.admin import (
    ai_studio,
    audit,
    content_studio,
    control_room,
    knowledge_base,
    marketplace,
    mcp,
    secrets,
)
from .api.student import learning, stats
from .config import get_settings
from .core.logging import setup_logging
from .middleware.request_id import RequestIDMiddleware

setup_logging()
settings = get_settings()

app = FastAPI(title="Certingo Academy API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)

# Auth Router
app.include_router(auth.router)

# Admin Routers
app.include_router(audit.router, prefix="/api/admin")
app.include_router(secrets.router, prefix="/api/admin")
app.include_router(mcp.router, prefix="/api/admin")
app.include_router(marketplace.router, prefix="/api/admin")
app.include_router(control_room.router, prefix="/api/admin")
app.include_router(content_studio.router, prefix="/api/admin")
app.include_router(ai_studio.router, prefix="/api/admin")
app.include_router(knowledge_base.router, prefix="/api/admin")

# Student Routers
app.include_router(learning.router, prefix="/api/academy")
app.include_router(stats.router, prefix="/api/academy")

@app.get("/health")
async def health():
    return {"status": "healthy"}
