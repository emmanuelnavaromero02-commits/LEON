# Import Certification Pack

Certification packs are found in `/content/packs/`.

To import the AWS Cloud Practitioner pack:
```bash
curl -X POST http://localhost:8000/api/academy/admin/packs/import-aws
```

This will:
- Register the pack in the marketplace.
- Install the certification for the default tenant.
- Load domains, skills, questions, and knowledge base documents.
