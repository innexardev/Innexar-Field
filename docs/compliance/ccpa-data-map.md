# CCPA / Privacy Data Map — FieldForge

> Mapa de dados pessoais para compliance US (CCPA + boas práticas).

## Categorias de dados

| Categoria | Exemplos | Retenção | Base legal |
|-----------|----------|----------|------------|
| Tenant admin PII | Nome, email, phone | Conta ativa + 1 ano | Contrato |
| Customer PII | Nome, endereço, phone | Conta tenant + política tenant | Interesse legítimo tenant |
| Payment | Stripe customer ID (tokenized) | Stripe policy | Contrato |
| Field photos | Job site images | 7 anos ou política tenant | Contrato |
| Audit logs | IP, user agent, actions | 2 anos | Segurança |
| Analytics | Page views anonimizados | 26 meses | Consentimento |

## Direitos do titular (CCPA)

| Direito | Implementação |
|---------|---------------|
| Access | `GET /api/v1/privacy/export` |
| Delete | `DELETE /api/v1/privacy/account` + cascade tenant |
| Opt-out sale | N/A — não vendemos dados |
| Correct | `PATCH` profile endpoints |

## Subprocessadores

| Vendor | Dados | DPA |
|--------|-------|-----|
| Stripe | Payment | Sim |
| Fly.io/Vercel | Hosting | Sim |
| Twilio | SMS phone | Sim |
| Sentry | Error traces (scrubbed) | Sim |

## Retenção automática

- Tenant churned > 90 dias: soft delete → hard delete 30 dias após aviso.
- Backups expiram conforme [disaster-recovery.md](../ops/disaster-recovery.md).
