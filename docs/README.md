# Innexar Field — Documentação do Projeto

Índice central da documentação técnica e de engenharia.

## Domínio (DDD)

| Documento | Descrição |
|-----------|-----------|
| [domain/context-map.md](domain/context-map.md) | Bounded contexts e integrações |
| [domain/glossary.md](domain/glossary.md) | Ubiquitous language |
| [domain/aggregates.md](domain/aggregates.md) | Aggregate roots e invariantes |
| [domain/events.md](domain/events.md) | Domain events e outbox |

## Arquitetura (ADRs)

| ADR | Título |
|-----|--------|
| [adr/template.md](adr/template.md) | Template para novas decisões |
| [adr/0001-plugin-architecture.md](adr/0001-plugin-architecture.md) | Arquitetura plugin-play |
| [adr/0002-multitenant-rls.md](adr/0002-multitenant-rls.md) | Multitenant com RLS |
| [adr/0003-event-outbox-saga.md](adr/0003-event-outbox-saga.md) | Outbox + sagas financeiras |
| [adr/0004-resilience-integrations.md](adr/0004-resilience-integrations.md) | Circuit breaker e timeouts |
| [adr/0005-platform-admin-boundary.md](adr/0005-platform-admin-boundary.md) | Platform Admin boundary e super-admin auth |

## Módulos

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [modules/onboarding.md](modules/onboarding.md) | Onboarding wizard — `packages/core/onboarding`, `apps/web/app/onboarding` | Implementado |
| [modules/platform-admin.md](modules/platform-admin.md) | Platform Admin — `packages/core/platform`, `apps/admin` | Implementado |

## Testes

| Item | Status |
|------|--------|
| DT-04 TenantIsolation | Completo — 11 plugins + integrations no CI (`.github/workflows/ci.yml`) |

## Segurança

| Documento | Descrição |
|-----------|-----------|
| [security/threat-model.md](security/threat-model.md) | STRIDE multitenant |
| [security/secrets.md](security/secrets.md) | Rotação e gestão de secrets |
| [security/api-security.md](security/api-security.md) | Rate limit, idempotency, auth |

## Operações (SRE)

| Documento | Descrição |
|-----------|-----------|
| [ops/slo.md](ops/slo.md) | SLOs e error budgets |
| [ops/disaster-recovery.md](ops/disaster-recovery.md) | RPO/RTO e restore |
| [ops/runbooks/deploy.md](ops/runbooks/deploy.md) | Deploy produção |
| [ops/runbooks/rollback.md](ops/runbooks/rollback.md) | Rollback |
| [ops/runbooks/incident-response.md](ops/runbooks/incident-response.md) | Resposta a incidentes |
| [ops/dora-metrics.md](ops/dora-metrics.md) | Métricas Accelerate |

## Compliance

| Documento | Descrição |
|-----------|-----------|
| [compliance/ccpa-data-map.md](compliance/ccpa-data-map.md) | Mapa de dados pessoais US |

## Configuração

- [../config/README.md](../config/README.md) — Config central dinâmica
- [../config/app.config.yaml](../config/app.config.yaml)

## API

- [api/openapi.yaml](api/openapi.yaml) — OpenAPI stub (expansão Fase 4)

## Planejamento visual

Canvas interativo: `canvases/erp-field-services-plan.canvas.tsx` (Cursor IDE)
