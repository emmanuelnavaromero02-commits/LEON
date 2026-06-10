from sqlalchemy.orm import Session
from .db import SessionLocal, engine
from . import models
import uuid

def seed():
    # Create tables
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Create Tenant
    tenant_id = "default-demo-tenant"
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        tenant = models.Tenant(id=tenant_id, name="Certingo Demo", slug="demo")
        db.add(tenant)
        db.flush()

        branding = models.TenantBranding(
            tenant_id=tenant_id,
            company_name="Certingo Academy",
            primary_color="#000000",
            secondary_color="#6366f1",
            theme="light"
        )
        db.add(branding)

        ai_settings = models.TenantAISettings(tenant_id=tenant_id, provider="mock")
        db.add(ai_settings)

    # Create Certification
    cert_id = "aws-cloud-practitioner"
    cert = db.query(models.Certification).filter(models.Certification.id == cert_id).first()
    if not cert:
        cert = models.Certification(
            id=cert_id,
            tenant_id=tenant_id,
            name="AWS Cloud Practitioner",
            provider="AWS",
            version="CLF-C02",
            description="Foundational AWS certification"
        )
        db.add(cert)
        db.flush()

        # Domains
        domains = [
            ("cloud-concepts", "Cloud Concepts", 0.24),
            ("security", "Security and Compliance", 0.30),
            ("technology", "Cloud Technology and Services", 0.34),
            ("billing", "Billing, Pricing, and Support", 0.12)
        ]

        for d_id, d_name, d_weight in domains:
            domain = models.Domain(
                id=d_id,
                certification_id=cert_id,
                tenant_id=tenant_id,
                name=d_name,
                weight=d_weight
            )
            db.add(domain)
            db.flush()

            # Skills for Security Domain
            if d_id == "security":
                skills = [
                    ("shared-responsibility", "Shared Responsibility Model", "beginner"),
                    ("iam-basics", "IAM Basics", "beginner"),
                    ("compliance", "AWS Compliance", "intermediate")
                ]
                for s_id, s_name, s_level in skills:
                    skill = models.Skill(
                        id=s_id,
                        domain_id=d_id,
                        tenant_id=tenant_id,
                        name=s_name,
                        level=s_level
                    )
                    db.add(skill)
                    db.flush()

                    # Knowledge Doc
                    kb = models.KnowledgeBase(id=f"kb-{s_id}", tenant_id=tenant_id, name=f"{s_name} KB")
                    db.add(kb)
                    db.flush()

                    doc = models.KnowledgeDocument(
                        id=str(uuid.uuid4()),
                        tenant_id=tenant_id,
                        kb_id=kb.id,
                        title=f"Official Guide: {s_name}",
                        content=f"This is the official knowledge content for {s_name}. It covers the core principles and best practices.",
                        metadata_json={"related_skills": [s_id]},
                        version="1.0"
                    )
                    db.add(doc)

                    # Questions
                    for i in range(5):
                        q = models.Question(
                            id=str(uuid.uuid4()),
                            skill_id=s_id,
                            tenant_id=tenant_id,
                            prompt=f"Sample question {i} for {s_name}?",
                            options=["Option A", "Option B", "Option C", "Option D"],
                            correct_answer="Option A",
                            explanation="This is the correct answer because of cloud principles.",
                            difficulty="medium" if i % 2 == 0 else "easy",
                            status="approved"
                        )
                        db.add(q)

    db.commit()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
