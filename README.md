# FieldForge

Premium multitenant ERP for house cleaning, construction, and field services in the United States.

## Status

| Área | Status |
|------|--------|
| Planejamento & arquitetura | Documentado |
| Engenharia (DDD, SRE, security) | Documentado |
| Config central | Implementado |
| Apps (web, api, marketing) | Pendente Fase 4 |
| CI | GitHub Actions |

## Quick start

```bash
cd projects/fieldforge
npm ci
npm run validate          # config + docs + markdown links
npm run typecheck         # @fieldforge/config
```

## Documentação

Índice completo: [docs/README.md](docs/README.md)

| Área | Link |
|------|------|
| Domain (DDD) | [docs/domain/](docs/domain/) |
| ADRs | [docs/adr/](docs/adr/) |
| Security | [docs/security/](docs/security/) |
| SRE / Ops | [docs/ops/](docs/ops/) |
| Config | [config/app.config.yaml](config/app.config.yaml) |
| API (stub) | [docs/api/openapi.yaml](docs/api/openapi.yaml) |

## Estrutura

```
fieldforge/
├── .github/           # CI, DOD, CODEOWNERS, PR template
├── config/            # Config central dinâmica (brand, pricing, debug)
├── docs/              # Documentação de engenharia completa
├── packages/
│   ├── config/        # Loader TypeScript
│   └── core/
│       └── resilience/  # Circuit breaker (Fase 4)
├── scripts/           # Validação CI
└── apps/              # (próximo) marketing, web, api, native
```

## Git workflow

```
main       → produção
develop    → integração
feature/*  → novas funcionalidades
```

Ver [.github/DOD.md](.github/DOD.md) para Definition of Done.

## Canvas de planejamento

Abra no Cursor IDE: `canvases/erp-field-services-plan.canvas.tsx`
