# ADR-0004: Resilience for External Integrations

## Status

Accepted

## Context

Dependências críticas: Stripe, Avalara, QuickBooks, Twilio. Falhas externas não podem derrubar API (Release It!).

## Decision

Implementar em `packages/core/resilience/`:

| Pattern | Config padrão |
|---------|---------------|
| Circuit Breaker | 5 falhas → open 30s → half-open |
| Timeout | connect 5s, read 30s |
| Retry | 3x exponential backoff + jitter (só idempotent ops) |
| Bulkhead | max 10 goroutines concurrentes por tenant para plugins |

Fallback Avalara: enfileirar cálculo manual + flag invoice `tax_pending`.

Health: `/health/live` (process up), `/health/ready` (DB + Redis + queue).

## Consequences

### Positivas

- Degradação graciosa.
- Blast radius limitado por tenant.

### Negativas

- Estados circuit open requerem monitoramento e alertas.

## Referências

- Nygard — Release It!
- `docs/ops/slo.md`
