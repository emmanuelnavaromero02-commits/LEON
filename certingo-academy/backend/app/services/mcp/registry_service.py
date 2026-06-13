import uuid

import httpx
from sqlalchemy.orm import Session

from ...database import models
from ..audit.audit_service import AuditService


class MCPRegistryService:
    def __init__(self, db: Session, audit: AuditService):
        self.db = db
        self.audit = audit

    async def register_server(self, tenant_id: str, name: str, url: str, category: str, description: str):
        server = models.MCPServer(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            name=name,
            url=url,
            category=category,
            description=description
        )
        self.db.add(server)
        self.db.commit()
        return server

    async def fetch_tools(self, server_id: str):
        server = self.db.query(models.MCPServer).filter(models.MCPServer.id == server_id).first()
        if not server:
            return []

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{server.url}/mcp/tools")
                if response.status_code == 200:
                    data = response.json()
                    server.tool_count = len(data.get("tools", []))
                    self.db.commit()
                    return data.get("tools", [])
            except Exception as e:
                print(f"Error fetching MCP tools: {e}")
        return []

    async def invoke_tool(self, tenant_id: str, server_id: str, tool_name: str, args: dict, user_id: str, role: str):
        server = self.db.query(models.MCPServer).filter(models.MCPServer.id == server_id).first()
        if not server:
            raise Exception("Server not found")

        # Security Context Construction
        security_context = {
            "trusted": True,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "role": role,
            "source": "certingo-backend"
        }

        async with httpx.AsyncClient() as client:
            payload = {
                "tool": tool_name,
                "args": args,
                "security_context": security_context
            }

            try:
                response = await client.post(f"{server.url}/mcp/invoke", json=payload)
                status = "success" if response.status_code == 200 else "failure"

                log = models.MCPInvocationLog(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    server_id=server_id,
                    tool_name=tool_name,
                    request_json=payload,
                    response_json=response.json() if response.status_code == 200 else {"error": response.text},
                    status=status,
                    duration_ms=500 # Mock
                )
                self.db.add(log)
                self.db.commit()

                return response.json()
            except Exception as e:
                raise e
