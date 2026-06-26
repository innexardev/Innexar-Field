# Context Map — FieldForge

> Bounded contexts e padrões de integração (DDD — Evans).

## Diagrama de contextos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Identity &      │     │ Commercial      │     │ Estimating      │
│ Access          │────▶│ (CRM)           │────▶│                 │
│ (tenant RBAC)   │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │              tenant.created            quote.accepted
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Platform        │     │ Operations      │◀───▶│ Financial       │
│ (Core/Plugins)  │     │ Scheduling/Dispatch│   │ Billing/Costing │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐            │
         └─────────────▶│ Verticals       │◀───────────┘
                        │ Cleaning/Build  │
                        └─────────────────┘

┌──────────────────────────┐
│ Platform Administration  │  super_admin · cross-tenant · ADR-0005
│ (config, registry, stats)│  packages/core/platformadmin · apps/admin
└────────────┬─────────────┘
             │ reads tenants / publishes public config
             ▼
      Platform · Identity · Marketing
```

## Contextos

| Contexto | Responsabilidade | Time / pacote |
|----------|------------------|---------------|
| **Identity & Access** | Auth, tenants, users, RBAC, audit | `packages/core/identity` |
| **Commercial** | Leads, customers, properties, contracts | `plugins/crm` |
| **Estimating** | Quotes, price book, proposals, takeoff | `plugins/estimating` |
| **Operations** | Schedule, dispatch, work orders, time | `plugins/scheduling`, `dispatch` |
| **Financial** | Invoices, expenses, job costing, tax | `plugins/invoicing`, `expenses`, `accounting`, `payroll`, `jobcosting` |
| **Verticals** | Cleaning, construction-specific rules | `plugins/cleaning`, `construction` |
| **Platform** | Plugin registry, config, onboarding | `packages/core`, `packages/core/onboarding` |
| **Platform Administration** | Super-admin ops, global config, tenant registry, stats | `packages/core/platform`, `apps/admin` |

## Padrões de integração

| De → Para | Padrão | Exemplo |
|-----------|--------|---------|
| Estimating → Operations | **Customer/Supplier** | `quote.accepted` cria Job |
| Operations → Financial | **Customer/Supplier** | `job.completed` gera invoice line |
| Financial → External | **Anti-corruption Layer** | QuickBooks adapter |
| Verticals → Core | **Conformist** | Plugin implementa interface `Plugin` |
| Identity → Todos | **Shared Kernel** | `tenant_id`, JWT claims (tenant sessions) |
| Platform Admin → Identity | **Customer/Supplier** | Read `tenants`, limited lifecycle PATCH |
| Platform Admin → Marketing | **Published Language** | Merged public config (plans, landing) |
| Identity → Platform Admin | **Shared Kernel** | JWT verify, password hash only |
| Eventos assíncronos | **Published Language** | JSON schema versionado em `domain/events.md` |

## Regras

1. Nenhum contexto acessa tabelas de outro diretamente — apenas via API ou eventos.
2. Integrações externas (Stripe, Avalara, Gusto) vivem em ACL dedicada por vendor.
3. `tenant_id` é obrigatório em toda persistência cross-context **tenant-scoped** (exceção: tabelas `platform_*` — ADR-0005).

## Status

| Item | Status |
|------|--------|
| Context map | Documentado |
| Implementação código | Em progresso — core + 11 plugins, `apps/web`, `apps/admin` |
| DT-04 TenantIsolation | Completo — 11/11 plugins com testes integration no CI |
| Outbox consumers / saga | Pendente |

### Por contexto

| Contexto | Status |
|----------|--------|
| Identity & Access | Implementado |
| Commercial (CRM) | Implementado (MVP) |
| Estimating | Implementado (MVP) |
| Operations | Implementado (MVP) |
| Financial | Implementado (MVP) |
| Verticals | Implementado (MVP) |
| Platform + Onboarding | Implementado |
| Platform Administration | Implementado (ADR-0005) |
