---
name: create-plugin-module
description: >-
  Create a new FieldForge plugin module end-to-end — manifest, migrations,
  routes, events, tests, review. Use when adding packages/plugins/* or
  onboarding a new vertical module.
---

# Create Plugin Module

## Prerequisites

Read: `docs/domain/glossary.md`, `docs/domain/context-map.md`, `docs/adr/0001-plugin-architecture.md`.

## Workflow

### 1. Define scope (product-analyst)

- Plugin id: `kebab-case` (e.g. `job-costing`)
- Bounded context: confirm no cross-context DB access
- Industry packs: which verticals get this module
- Permissions: list RBAC keys (`{plugin}.read`, `{plugin}.write`)

### 2. Scaffold

```
packages/plugins/{plugin-id}/
├── manifest.yaml
├── plugin.go              # implements Plugin interface
├── internal/
│   ├── domain/
│   ├── service/
│   ├── repository/
│   └── handler/
├── migrations/
│   └── 001_init.sql
└── *_test.go
```

### 3. manifest.yaml

```yaml
id: job-costing
name: Job Costing
version: 1.0.0
dependencies: [core, jobs]
industry_packs: [construction, field-services]
permissions:
  - job-costing.read
  - job-costing.write
nav:
  - label: Job Costing
    path: /job-costing
    icon: calculator
```

### 4. Migrations

Every table:
- `id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `created_at`, `updated_at`
- RLS: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`

### 5. Routes

Register under `/api/v1/{plugin}/` via `RegisterRoutes`.

### 6. Events

Add to `docs/domain/events.md`:
- `{Plugin}.{Action}` — payload schema

### 7. Tests (mandatory)

- Unit: domain + service
- Integration: API + tenant isolation (A cannot read B)
- Run: `go test ./packages/plugins/{plugin-id}/...`

### 8. Review gate

Invoke `@.cursor/agents/tech-lead-reviewer.md` before merge.

## Checklist

- [ ] manifest.yaml
- [ ] Migrations + RLS
- [ ] Routes + OpenAPI stub
- [ ] Domain events documented
- [ ] Tests green
- [ ] ADR if new external integration
