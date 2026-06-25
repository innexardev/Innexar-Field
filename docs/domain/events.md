# Domain Events — FieldForge

> Catálogo de eventos e padrão Outbox (DDIA).

## Transporte

1. Aggregate publica evento na mesma transação DB.
2. Evento gravado em `outbox_events` (Outbox pattern).
3. Worker publica para NATS/Redis e marca `published_at`.
4. Consumidores idempotentes (`event_id` dedup).

## Schema

```json
{
  "event_id": "uuid",
  "event_type": "estimating.quote.accepted",
  "event_version": 1,
  "tenant_id": "uuid",
  "aggregate_type": "Estimate",
  "aggregate_id": "uuid",
  "occurred_at": "ISO8601",
  "payload": {}
}
```

## Catálogo v1

| Evento | Produtor | Consumidores |
|--------|----------|--------------|
| `identity.tenant.created` | Identity | Platform (provision) |
| `estimating.quote.accepted` | Estimating | Operations, Financial, Commercial |
| `operations.job.completed` | Operations | Financial, Commercial, Verticals |
| `financial.expense.approved` | Financial | Financial (job costing) |
| `financial.invoice.paid` | Financial | Commercial, Reporting |
| `construction.change_order.approved` | Verticals | Financial, Operations |

## Saga: Quote → Job → Invoice

```
quote.accepted
  → [JobCreated] operations
  → [BudgetCreated] financial (job costing)
  → on failure: compensating JobCancelled
```

Orquestrador: `packages/core/saga/quote_acceptance.go`

Timeouts: 30s por step; retry 3x com backoff; dead letter após falha.

## Versionamento

- `event_version` incrementa em breaking changes.
- Consumidores suportam N e N-1 por 90 dias.
