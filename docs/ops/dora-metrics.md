# DORA Metrics — FieldForge

Metas alinhadas a *Accelerate* (Forsgren et al.).

| Métrica | MVP (6 meses) | Elite (12 meses) |
|---------|---------------|------------------|
| **Deploy frequency** | 1x / semana | On-demand (multiple/day) |
| **Lead time for changes** | < 1 semana | < 1 dia |
| **MTTR** | < 4 horas | < 1 hora |
| **Change fail rate** | < 15% | < 5% |

## Coleta

- Deploy frequency: GitHub Actions deploy workflow count.
- Lead time: merge commit → deploy prod timestamp.
- MTTR: incident opened → resolved (PagerDuty).
- Change fail rate: deploys causing rollback / hotfix.

## Revisão

Dashboard mensal em sprint retrospective.
