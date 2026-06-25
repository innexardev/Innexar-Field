# Runbook: Incident Response

## Severidades

| Sev | Exemplo | Resposta | Resolução |
|-----|---------|----------|-----------|
| P1 | API down, payments fail | 15 min | 4 h |
| P2 | Dispatch degradado | 1 h | 8 h |
| P3 | Report lento | 4 h | 3 dias |
| P4 | Typo UI | 1 dia | Sprint |

## Fluxo P1

1. **Detect** — alerta ou report
2. **Triage** — on-call confirma severidade
3. **Communicate** — status page + canal interno
4. **Mitigate** — rollback, scale, disable feature flag
5. **Resolve** — fix deployado
6. **Post-mortem** — 48h, blameless, ações concretas

## Roles

- **Incident Commander** — coordena
- **Tech Lead** — investiga
- **Comms** — updates externos

## Post-mortem template

- Timeline
- Root cause (5 whys)
- Impact (tenants, revenue)
- What went well
- Action items (owner + date)
