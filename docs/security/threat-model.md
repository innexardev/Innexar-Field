# Threat Model — FieldForge (STRIDE)

> Multitenant SaaS — field services + financial data (US).

## Escopo

- API Go (`api.fieldforge.com`)
- App web + PWA (`app.fieldforge.com`)
- Marketing site (read-only, menor risco)
- Integrações: Stripe, Avalara, QuickBooks, Twilio

## Ativos

| Ativo | Sensibilidade |
|-------|---------------|
| Tenant business data | Alta |
| Customer PII (end users) | Alta |
| Payment tokens (Stripe) | Crítica |
| Auth credentials | Crítica |
| API keys integrações | Crítica |

## STRIDE

| Ameaça | Descrição | Mitigação | Status |
|--------|-----------|-----------|--------|
| **S** Spoofing | JWT roubado, session hijack | Short TTL, refresh rotation, MFA opcional, HttpOnly cookies | Planejado |
| **T** Tampering | Manipular `tenant_id` header | RLS + JWT claim only + audit log | Planejado |
| **R** Repudiation | Negar alteração invoice | Audit trail append-only | Planejado |
| **I** Info disclosure | Cross-tenant data leak | RLS tests, pen test, mínimo em logs | **P0 tests** |
| **D** Denial of Service | Flood API/signup | Rate limit IP + tenant, WAF CDN | Documentado |
| **E** Elevation | field-tech → admin | RBAC least privilege, test matrix roles | Planejado |

## Vetores mobile

- Offline queue: validar assinatura server-side ao sync.
- Fotos: scan malware, size limit, tenant-scoped S3 prefix.

## Revisão

- A cada release major.
- Após incidente P1/P2.
- Próxima: antes go-live beta.

## Pen test checklist (beta)

- [ ] IDOR cross-tenant em `/clients/{id}`
- [ ] SQL injection em filtros listagem
- [ ] Mass assignment em PATCH endpoints
- [ ] Stripe webhook signature bypass
- [ ] Debug endpoints desabilitados em prod
