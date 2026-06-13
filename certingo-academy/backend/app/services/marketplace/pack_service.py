import os
import uuid

import yaml
from sqlalchemy.orm import Session

from ...database import models
from ..audit.audit_service import AuditService


class PackImportService:
    def __init__(self, db: Session, audit: AuditService):
        self.db = db
        self.audit = audit

    async def import_pack(self, tenant_id: str, pack_path: str, user_id: str):
        with open(os.path.join(pack_path, "pack.yml"), 'r') as f:
            pack_config = yaml.safe_load(f)

        pack_id = pack_config['id']

        # 1. Register Pack
        pack = self.db.query(models.CertificationPack).filter(models.CertificationPack.id == pack_id).first()
        if not pack:
            pack = models.CertificationPack(
                id=pack_id,
                name=pack_config['name'],
                provider=pack_config['provider'],
                version=pack_config['version'],
                description=pack_config.get('description', ''),
                manifest_json=pack_config
            )
            self.db.add(pack)

        # 2. Track Installation
        installation = models.TenantCertificationInstallation(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            certification_id=pack_config.get('certification_id', pack_id),
            pack_id=pack_id,
            status=models.CertificationStatus.INSTALLING,
            installed_by=user_id
        )
        self.db.add(installation)
        self.db.commit()

        try:
            # 3. Import Certification
            with open(os.path.join(pack_path, "certification.yml"), 'r') as f:
                cert_data = yaml.safe_load(f)

            cert = models.Certification(
                id=cert_data['id'],
                tenant_id=tenant_id,
                name=cert_data['name'],
                provider=cert_data['provider'],
                version=cert_data['version'],
                description=cert_data.get('description', ''),
                status=models.ContentStatus.PUBLISHED
            )
            self.db.merge(cert)

            # 4. Domains
            with open(os.path.join(pack_path, "domains.yml"), 'r') as f:
                domains = yaml.safe_load(f)
            for d in domains:
                domain = models.Domain(
                    id=d['id'],
                    certification_id=cert.id,
                    tenant_id=tenant_id,
                    name=d['name'],
                    weight=d['weight']
                )
                self.db.merge(domain)

            # 5. Skills
            with open(os.path.join(pack_path, "skills.yml"), 'r') as f:
                skills = yaml.safe_load(f)
            for s in skills:
                skill = models.Skill(
                    id=s['id'],
                    domain_id=s['domain_id'],
                    tenant_id=tenant_id,
                    name=s['name'],
                    description=s.get('description', ''),
                    level=s.get('level', 'beginner')
                )
                self.db.merge(skill)

            # 6. Learning Bits
            if os.path.exists(os.path.join(pack_path, "learning_bits.yml")):
                with open(os.path.join(pack_path, "learning_bits.yml"), 'r') as f:
                    bits = yaml.safe_load(f)
                for b in bits:
                    bit = models.LearningBit(
                        id=b.get('id', str(uuid.uuid4())),
                        tenant_id=tenant_id,
                        certification_id=cert.id,
                        skill_id=b.get('skill_id'),
                        type=b['type'],
                        title=b['title'],
                        content=b['content'],
                        difficulty=b.get('difficulty', 'beginner'),
                        status=models.ContentStatus.PUBLISHED,
                        created_by="system-pack"
                    )
                    self.db.merge(bit)

            # 7. Questions
            if os.path.exists(os.path.join(pack_path, "questions.yml")):
                with open(os.path.join(pack_path, "questions.yml"), 'r') as f:
                    questions = yaml.safe_load(f)
                for q in questions:
                    question = models.Question(
                        id=q.get('id', str(uuid.uuid4())),
                        skill_id=q['skill_id'],
                        tenant_id=tenant_id,
                        prompt=q['prompt'],
                        options=q['options'],
                        correct_answer=q['correct_answer'],
                        explanation=q.get('explanation', ''),
                        difficulty=q.get('difficulty', 'medium'),
                        status=models.ContentStatus.PUBLISHED,
                        created_by="system-pack"
                    )
                    self.db.merge(question)

            # 8. Knowledge Documents
            kb_path = os.path.join(pack_path, "knowledge")
            if os.path.exists(kb_path):
                kb = self.db.query(models.KnowledgeBase).filter(models.KnowledgeBase.tenant_id == tenant_id).first()
                if not kb:
                    kb = models.KnowledgeBase(id=str(uuid.uuid4()), tenant_id=tenant_id, name="General Knowledge")
                    self.db.add(kb)
                    self.db.flush()

                for filename in os.listdir(kb_path):
                    if filename.endswith(".md"):
                        with open(os.path.join(kb_path, filename), 'r') as f:
                            content = f.read()

                        doc = models.KnowledgeDocument(
                            id=str(uuid.uuid4()),
                            tenant_id=tenant_id,
                            kb_id=kb.id,
                            title=filename.replace(".md", ""),
                            source_type="markdown",
                            content=content,
                            status=models.ContentStatus.PUBLISHED,
                            version="1.0",
                            created_by="system-pack"
                        )
                        self.db.add(doc)

            installation.status = models.CertificationStatus.READY
            self.db.commit()

            self.audit.log(self.db, tenant_id, user_id, "pack_installed", "CertificationPack", pack_id, "success")

        except Exception as e:
            self.db.rollback()
            installation.status = models.CertificationStatus.FAILED
            installation.error_message = str(e)
            self.db.commit()
            self.audit.log(self.db, tenant_id, user_id, "pack_installed", "CertificationPack", pack_id, "failure", {"error": str(e)})
            raise e
