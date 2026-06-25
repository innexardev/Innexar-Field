# Context Map — FieldForge

> Bounded contexts e padrões de integração (DDD — Evans).

## Diagrama de contextos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Identity &      │     │ Commercial      │     │ Estimating      │
│ Access          │────▶│ (CRM)           │────▶│                 │
│                 │     │                 │     │                 │
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
```

## Contextos

| Contexto | Responsabilidade | Time / pacote |
|----------|------------------|---------------|
| **Identity & Access** | Auth, tenants, users, RBAC, audit | `packages/core/identity` |
| **Commercial** | Leads, customers, properties, contracts | `plugins/crm` |
| **Estimating** | Quotes, price book, proposals, takeoff | `plugins/estimating` |
| **Operations** | Schedule, dispatch, work orders, time | `plugins/scheduling`, `field-services` |
| **Financial** | Invoices, expenses, job costing, tax | `plugins/invoicing`, `expenses` |
| **Verticals** | Cleaning, construction-specific rules | `plugins/cleaning`, `construction` |
| **Platform** | Plugin registry, config, onboarding | `packages/core` |

## Padrões de integração

| De → Para | Padrão | Exemplo |
|-----------|--------|---------|
| Estimating → Operations | **Customer/Supplier** | `quote.accepted` cria Job |
| Operations → Financial | **Customer/Supplier** | `job.completed` gera invoice line |
| Financial → External | **Anti-corruption Layer** | QuickBooks adapter |
| Verticals → Core | **Conformist** | Plugin implementa interface `Plugin` |
| Identity → Todos | **Shared Kernel** | `tenant_id`, JWT claims |
| Eventos assíncronos | **Published Language** | JSON schema versionado em `domain/events.md` |

## Regras

1. Nenhum contexto acessa tabelas de outro diretamente — apenas via API ou eventos.
2. Integrações externas (Stripe, Avalara, Gusto) vivem em ACL dedicada por vendor.
3. `tenant_id` é obrigatório em toda persistência cross-context.

## Status

| Item | Status |
|------|--------|
| Context map | Documentado |
| Implementação código | Pendente Fase 4 |
