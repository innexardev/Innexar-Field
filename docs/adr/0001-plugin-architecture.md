# ADR-0001: Plugin-Play Architecture

## Status

Accepted

## Context

FieldForge atende três verticais (cleaning, construction, field services) com módulos ativáveis por tenant. Precisamos adicionar módulos sem redeploy do core e cobrar por módulo via Stripe.

## Decision

- Cada módulo implementa interface `Plugin` em Go.
- `PluginRegistry` descobre plugins no boot (auto-discovery + manifest YAML).
- Rotas, eventos, migrations e permissões registrados via plugin.
- Frontend consome menu dinâmico de `GET /api/v1/plugins`.
- Industry packs no onboarding ativam subset de plugins.

## Consequences

### Positivas

- Novos verticais sem alterar kernel.
- Billing alinhado a módulos.
- Times podem ownership por `packages/plugins/*`.

### Negativas

- Complexidade inicial do registry e contract testing entre plugins.
- Migrations ordenadas por dependência.

## Referências

- `docs/domain/context-map.md`
- `config/app.config.yaml` → industry packs
