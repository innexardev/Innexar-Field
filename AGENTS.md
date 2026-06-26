# AGENTS.md — FieldForge

> Portable agent instructions (Cursor, Claude Code, Copilot).

## Project

Premium multitenant ERP for field services (US): cleaning, construction, field ops.

## Stack

- **Backend:** Go + Fiber, plugin-play, PostgreSQL RLS
- **Frontend:** Next.js 15, Tailwind, PWA `/m/*`
- **Mobile:** Capacitor (iOS/Android)
- **Config:** `config/app.config.yaml` — single source for brand, pricing, debug

## Commands

```bash
npm run validate          # config + docs + links
npm run typecheck
go test ./... -race       # when Go code exists
```

## Architecture

- Bounded contexts: `docs/domain/context-map.md`
- Ubiquitous language: `docs/domain/glossary.md`
- ADRs: `docs/adr/`
- Never cross tenant boundaries; always `tenant_id` + RLS

## Agent roster

Invoke via `@.cursor/agents/<name>.md` or describe the role in chat.

| Agent | Use when |
|-------|----------|
| [architect](.cursor/agents/architect.md) | Design, ADRs, context boundaries |
| [backend-go](.cursor/agents/backend-go.md) | Go API, plugins, workers |
| [frontend-nextjs](.cursor/agents/frontend-nextjs.md) | Web, marketing, UI |
| [mobile-engineer](.cursor/agents/mobile-engineer.md) | PWA, Capacitor |
| [qa-engineer](.cursor/agents/qa-engineer.md) | Tests, coverage, E2E |
| [security-auditor](.cursor/agents/security-auditor.md) | Threat model, OWASP |
| [devops-sre](.cursor/agents/devops-sre.md) | CI, deploy, SLO |
| [tech-lead-reviewer](.cursor/agents/tech-lead-reviewer.md) | Final module review |
| [product-analyst](.cursor/agents/product-analyst.md) | Requirements, glossary |

## Module creation flow

1. **product-analyst** — confirm terms + acceptance criteria
2. **architect** — ADR if new boundary/integration
3. **backend-go** / **frontend-nextjs** — implement with tests
4. **qa-engineer** — verify pyramid + tenant isolation
5. **security-auditor** — if auth, billing, or PII
6. **tech-lead-reviewer** — merge gate

Skill: `.cursor/skills/create-plugin-module/SKILL.md`

## Non-negotiables

- Clean code: small functions, no duplication, match conventions
- Tests with every module: unit + integration minimum
- Conventional Commits; PR required; no direct push to `main`
- Read `docs/` before implementing domain logic
- Use `@fieldforge/config` for brand/pricing — never hardcode

## Rules

Cursor rules: `.cursor/rules/*.mdc` — auto-attach by file type.
