from .db import SessionLocal
from .models import Tenant, User, UserRole, LearnerProfile, TenantAISettings
import uuid

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
    users = [
        ("superadmin@certingo.demo", "Super Admin", UserRole.SUPER_ADMIN),
        ("admin@certingo.demo", "Tenant Admin", UserRole.TENANT_ADMIN),
        ("student@certingo.demo", "Jane Student", UserRole.STUDENT),
    ]

    for email, name, role in users:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u_id = str(uuid.uuid4())
            u = User(id=u_id, tenant_id=tenant_id, email=email, full_name=name, role=role)
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

    db.commit()
    print("Base seed completed.")
    db.close()

if __name__ == "__main__":
    seed()
