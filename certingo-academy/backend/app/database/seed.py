import uuid

from ..core.security import hash_password
from .db import SessionLocal
from .models import LearnerProfile, Tenant, TenantAISettings, User, UserRole

# Demo credentials (documented in .env.example at the project root)
DEMO_USERS = [
    ("superadmin@certingo.demo", "Super Admin", UserRole.SUPER_ADMIN, "superadmin123"),
    ("admin@certingo.demo", "Tenant Admin", UserRole.TENANT_ADMIN, "admin123"),
    ("student@certingo.demo", "Jane Student", UserRole.STUDENT, "student123"),
]

def seed():
    db = SessionLocal()
    tenant_id = "default-demo-tenant"

    # 1. Tenant
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        tenant = Tenant(id=tenant_id, name="Certingo Demo", slug="demo")
        db.add(tenant)
        db.flush()

        ai_settings = TenantAISettings(tenant_id=tenant_id, provider="mock")
        db.add(ai_settings)

    # 2. Users
    for email, name, role, password in DEMO_USERS:
        u = db.query(User).filter(User.tenant_id == tenant_id, User.email == email).first()
        if not u:
            u_id = str(uuid.uuid4())
            u = User(
                id=u_id,
                tenant_id=tenant_id,
                email=email,
                full_name=name,
                role=role,
                hashed_password=hash_password(password),
            )
            db.add(u)
            if role == UserRole.STUDENT:
                profile = LearnerProfile(
                    id=str(uuid.uuid4()),
                    user_id=u_id,
                    tenant_id=tenant_id,
                    background="non-technical",
                    preferred_style="simple-analogies",
                    weekly_time_minutes=120,
                    confidence_level=0.6
                )
                db.add(profile)
        elif not u.hashed_password:
            # Backfill passwords for users created before auth existed
            u.hashed_password = hash_password(password)

    db.commit()
    print("Base seed completed.")
    db.close()

if __name__ == "__main__":
    seed()
