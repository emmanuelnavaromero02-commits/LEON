from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .middleware.request_id import RequestIDMiddleware
from .core.logging import setup_logging
from .database.db import engine, Base
from .api.admin import audit, secrets, mcp, marketplace, control_room, content_studio, ai_studio
from .api.student import learning
import os

setup_logging()

app = FastAPI(title="Certingo Academy API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)

# Admin Routers (Prefixed with /api/admin)
app.include_router(audit.router, prefix="/api/admin")
app.include_router(secrets.router, prefix="/api/admin")
app.include_router(mcp.router, prefix="/api/admin")
app.include_router(marketplace.router, prefix="/api/admin")
app.include_router(control_room.router, prefix="/api/admin")
app.include_router(content_studio.router, prefix="/api/admin")
app.include_router(ai_studio.router, prefix="/api/admin")

# Student Routers (Flattened under /api/academy to match frontend)
app.include_router(learning.router, prefix="/api/academy")

@app.get("/health")
async def health():
    return {"status": "healthy"}
