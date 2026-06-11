from .db import SessionLocal
from .models import User, LearnerProfile, UserRole, Tenant, MasteryScore
import uuid

def seed_user():
    db = SessionLocal()
    tenant_id = "default-demo-tenant"
    user_id = "evidence-user-id"

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            tenant_id=tenant_id,
            email="evidence@certingo.com",
            full_name="Evidence Tester",
            role=UserRole.STUDENT
        )
        db.add(user)

        profile = LearnerProfile(
            id=str(uuid.uuid4()),
            user_id=user_id,
            tenant_id=tenant_id,
            target_certification_id="aws-cloud-practitioner",
            background="no-technical",
            preferred_style="simple-analogies",
            weekly_time_minutes=180,
            confidence_level=0.5
        )
        db.add(profile)

        # Add some mastery scores to make dashboard look good
        m1 = MasteryScore(user_id=user_id, tenant_id=tenant_id, skill_id="cloud-benefits", score=0.85)
        m2 = MasteryScore(user_id=user_id, tenant_id=tenant_id, skill_id="shared-responsibility", score=0.42)
        db.add(m1)
        db.add(m2)

        db.commit()
        print(f"User {user_id} seeded.")
    else:
        print("User already exists.")
    db.close()

if __name__ == "__main__":
    seed_user()
