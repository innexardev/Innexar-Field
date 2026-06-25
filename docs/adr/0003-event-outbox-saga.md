# ADR-0003: Event Outbox and Financial Sagas

## Status

Accepted

## Context

Fluxos quote → job → invoice cruzam bounded contexts. Publicação de eventos não pode perder mensagens nem duplicar efeitos (DDIA).

## Decision

1. **Transactional Outbox** — tabela `outbox_events` na mesma TX do aggregate.
2. **Idempotent consumers** — tabela `processed_events(event_id)`.
3. **Saga orchestration** para `quote.accepted` com compensação `JobCancelled`.
4. **Idempotency-Key** header em `POST /payments`, `POST /invoices` (Stripe).

## Consequences

### Positivas

- Consistência eventual confiável.
- Pagamentos seguros contra retry duplo.

### Negativas

- Latência adicional (worker poll/stream).
- Observabilidade de sagas stuck requer dashboard.

## Referências

- `docs/domain/events.md`
- `docs/domain/aggregates.md`
