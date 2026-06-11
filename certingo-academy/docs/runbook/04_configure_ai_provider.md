# Configure AI Provider

Certingo Academy supports multiple AI providers. Configuration can be done globally via environment variables or per-tenant via the Secrets Vault.

## Global Configuration
Set the following in your `.env` or shell:

\`\`\`bash
AI_PROVIDER=openai # or 'anthropic' or 'mock'
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=ant-...
\`\`\`

## Per-Tenant Configuration (Vault)
1. Go to **Admin Console** -> **Secrets / Vault**.
2. Add a new secret with the key \`OPENAI_API_KEY\`.
3. The backend will automatically prioritize tenant-specific keys during generation.

## RAG Safety
The system will refuse to generate lessons if it cannot find at least 50 characters of verified knowledge for the target skill, preventing hallucinations.
