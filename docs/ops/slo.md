# Service Level Objectives — FieldForge

## SLIs e SLOs

| SLI | SLO (30 dias) | Error budget |
|-----|---------------|--------------|
| API availability | 99.5% | 3h 39m downtime |
| API latency p95 | < 200ms | 5% requests podem exceder |
| Invoice payment success | 99.9% | 43 min falha/mês |
| Mobile sync success | 98% | 14.4h falha equivalente |
| Webhook processing | 99.5% | 3h 39m atraso crítico |

## Error budget policy

- **>50% budget consumido no mês:** freeze features, foco reliability.
- **Budget esgotado:** só hotfixes até recuperar 25%.

## Alertas

| Alerta | Condição | Severidade |
|--------|----------|------------|
| API down | health/ready fail 2min | P1 |
| p95 > 500ms | 5min sustained | P2 |
| Error rate > 1% | 5min | P2 |
| Stripe webhook backlog | >100 pending 10min | P1 |
| Cross-tenant test fail | CI | P0 block deploy |

## Ferramentas

- Metrics: Prometheus + Grafana
- Errors: Sentry
- Uptime: external probe + status page
- Traces: OpenTelemetry → Tempo/Jaeger

## Revisão

Trimestral com stakeholders; ajustar SLO após 6 meses de dados.
