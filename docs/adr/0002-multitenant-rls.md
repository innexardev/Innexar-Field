# ADR-0002: Multitenant with PostgreSQL RLS

## Status

Accepted

## Context

SaaS B2B nos EUA com tiers Starter (shared DB) até Enterprise (dedicated DB). Isolamento de dados é requisito P0 (threat model).

## Decision

| Tier | Estratégia |
|------|------------|
| Starter / Business | Shared DB, `tenant_id` em todas tabelas, **Row-Level Security** |
| Enterprise | Schema dedicado ou instância dedicada |

- JWT contém `tenant_id`; middleware seta `SET app.tenant_id` por request.
- Queries sem `tenant_id` falham em dev (`tenant_isolation_check` debug).
- Integration tests obrigatórios para leak cross-tenant.

## Consequences

### Positivas

- Custo baixo para SMB.
- Política RLS centralizada no Postgres.

### Negativas

- RLS mal configurado = vulnerabilidade crítica.
- Migrations devem incluir policies em toda tabela nova.

## Referências

- `docs/security/threat-model.md`
- ADR-0001
