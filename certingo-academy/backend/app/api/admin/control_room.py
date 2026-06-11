from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models

router = APIRouter(prefix="/control-room", tags=["admin-ops"])

@router.get("/status")
async def get_system_status(db: Session = Depends(get_db)):
    return {
        "health": "healthy",
        "tenants": db.query(models.Tenant).count(),
        "active_users": db.query(models.User).count(),
        "mcp_servers": db.query(models.MCPServer).count(),
        "ai_provider": "Mock / GPT-4o",
        "content_drafts": db.query(models.Lesson).filter(models.Lesson.status == "draft").count(),
        "questions_pending": db.query(models.Question).filter(models.Question.status == "draft").count()
    }
