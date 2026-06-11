from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.mcp.registry_service import MCPRegistryService
from ...services.audit.audit_service import AuditService

router = APIRouter(prefix="/mcp", tags=["admin-mcp"])

@router.get("/servers")
async def list_mcp_servers(db: Session = Depends(get_db)):
    return db.query(models.MCPServer).all()

@router.post("/servers")
async def register_mcp_server(data: dict, db: Session = Depends(get_db)):
    audit = AuditService()
    service = MCPRegistryService(db, audit)
    return await service.register_server(
        data['tenant_id'], data['name'], data['url'], data['category'], data['description']
    )

@router.get("/servers/{server_id}/tools")
async def fetch_mcp_tools(server_id: str, db: Session = Depends(get_db)):
    audit = AuditService()
    service = MCPRegistryService(db, audit)
    return await service.fetch_tools(server_id)
