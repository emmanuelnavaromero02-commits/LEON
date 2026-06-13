from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.mcp.registry_service import MCPRegistryService
from ...services.audit.audit_service import AuditService
from ..deps import require_role

require_admin = require_role(models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

router = APIRouter(prefix="/mcp", tags=["admin-mcp"])


class MCPServerCreate(BaseModel):
    name: str = Field(min_length=1)
    url: str = Field(min_length=1)
    category: str = ""
    description: str = ""


@router.get("/servers")
async def list_mcp_servers(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.MCPServer).filter(
        models.MCPServer.tenant_id == current_user.tenant_id
    ).all()

@router.post("/servers")
async def register_mcp_server(
    data: MCPServerCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    audit = AuditService()
    service = MCPRegistryService(db, audit)
    return await service.register_server(
        current_user.tenant_id, data.name, data.url, data.category, data.description
    )

@router.get("/servers/{server_id}/tools")
async def fetch_mcp_tools(
    server_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    server = db.query(models.MCPServer).filter(
        models.MCPServer.id == server_id,
        models.MCPServer.tenant_id == current_user.tenant_id,
    ).first()
    if server is None:
        raise HTTPException(status_code=404, detail="MCP server not found")

    audit = AuditService()
    service = MCPRegistryService(db, audit)
    return await service.fetch_tools(server_id)


@router.delete("/servers/{server_id}")
async def delete_mcp_server(
    server_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete an MCP server of the current tenant. 404 when cross-tenant/missing."""
    server = db.query(models.MCPServer).filter(
        models.MCPServer.id == server_id,
        models.MCPServer.tenant_id == current_user.tenant_id,
    ).first()
    if server is None:
        raise HTTPException(status_code=404, detail="MCP server not found")

    db.delete(server)
    db.commit()

    AuditService().log(
        db,
        current_user.tenant_id,
        current_user.id,
        "mcp_server_deleted",
        "MCPServer",
        server_id,
    )
    return {"status": "deleted", "id": server_id}
