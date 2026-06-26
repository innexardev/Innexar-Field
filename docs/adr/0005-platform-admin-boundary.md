# ADR-0005: Platform Admin Boundary and Super-Admin Auth

## Status

Proposed

## Context

FieldForge is a multitenant SaaS where **tenant workspace admin** (`owner`, `admin` roles) manages users, billing, and modules within a single tenant. FieldForge Inc. operators need a separate **Platform Admin** (uber-admin) capability to:

- Manage global SaaS configuration (plans, promotions, landing content) without redeploy
- View cross-tenant statistics (signups, MRR stub, module adoption)
- Inspect and support tenants from a registry
- Maintain an append-only audit trail of platform-level actions

The existing context map defines **Identity & Access** (tenant-scoped auth/RBAC) and **Platform** (plugin registry, config, onboarding). Today:

- All API routes under `/api/v1/*` (except public) require `tenant_id` in JWT and RLS session (`RequireTenant` middleware).
- `config/app.config.yaml` is the bootstrap source for brand, pricing, and features.
- JWT claims already stub `IsPlatformAdmin` and `IssuePlatformToken` with role `platform_admin` — not wired to routes or persistence.

Mixing platform operators into the tenant `users` table would violate isolation (ADR-0002), blur RBAC with `owner`, and force artificial tenant assignment for staff accounts.

## Decision

### 1. New bounded subcontext: Platform Administration

Add **Platform Administration** as a subcontext of **Platform**, distinct from **Identity & Access**:

| Context | Scope | Package |
|---------|-------|---------|
| **Identity & Access** | Tenant users, tenant RBAC, tenant-scoped audit | `packages/core/identity` |
| **Platform Administration** | Cross-tenant ops, global config, platform operators | `packages/core/platformadmin` |

Integration pattern:

- **Identity → Platform Admin**: Shared Kernel for JWT verification and password hashing only.
- **Platform Admin → Identity**: **Customer/Supplier** — reads `tenants`, `tenant_plugins`, subscription fields via repository; never writes tenant business data directly.
- **Platform Admin → Marketing/Web**: **Published Language** — merged public config (YAML + DB) consumed by `GET /api/v1/config/public`.

Platform-scoped tables live in schema `platform` (or prefix `platform_*`), **without** `tenant_id` and **without** RLS. Access is gated exclusively by platform-admin middleware, not by Postgres RLS.

### 2. Super-admin auth model

Platform operators are **not** tenant users.

| Aspect | Tenant session | Platform admin session |
|--------|----------------|------------------------|
| Table | `users` (tenant-scoped, RLS) | `platform_admins` |
| JWT `tenant_id` | Required UUID | Absent / empty |
| JWT `role` | `owner`, `admin`, … | `super_admin` |
| JWT flag | — | `is_platform_admin: true` |
| Login endpoint | `POST /api/v1/auth/login` | `POST /api/v1/platform/auth/login` |
| Middleware chain | `Auth` → `RequireTenant` → RLS | `Auth` → `RequirePlatformAdmin` (skips tenant RLS) |
| DB session | `SET app.tenant_id` | `RESET app.tenant_id` or bypass role |

**Bootstrap:** First `super_admin` created via CLI seed (`ff platform seed-admin`) or env-guarded one-shot on empty table — never via public signup.

**Token policy:** Shorter TTL than tenant tokens (default 8h), optional MFA (phase 2), IP allowlist in production. Platform tokens must not be accepted on tenant-protected routes and vice versa.

**Naming:** Canonical role slug is `super_admin`. Rename existing auth stub from `platform_admin` to `super_admin` during implementation.

### 3. Data model (platform scope)

| Table | Purpose |
|-------|---------|
| `platform_admins` | Operator accounts (`id`, `email`, `password_hash`, `role`, `mfa_secret`, `last_login_at`) |
| `platform_config` | Key-value JSON overrides (`key`, `value`, `version`, `updated_by`, `updated_at`) — brand fragments, feature toggles, contact |
| `plans` | Editable SaaS plan catalog (mirrors `app.config.yaml` pricing.plans shape) |
| `promotions` | Time-boxed discounts (`code`, `plan_id`, `discount_percent`, `starts_at`, `ends_at`, `active`) |
| `landing_sections` | CMS blocks for marketing (`slug`, `section_type`, `content` JSONB, `sort_order`, `published`) |
| `tenant_registry` | **Read model** — materialized view or table refreshed from `tenants` + billing aggregates for admin UI (not source of truth) |
| `platform_audit_log` | Append-only platform actions (`actor_id`, `action`, `resource_type`, `resource_id`, `metadata` JSONB, `ip`, `created_at`) |

`tenants` remains owned by Identity/onboarding; Platform Admin updates limited fields (plan override, suspend, feature flags) through a dedicated service with audit.

### 4. API namespace

Use **`/api/v1/platform/*`** for all platform-admin routes.

Reject **`/api/v1/admin/*`** — collides semantically with tenant workspace “admin” (`owner`/`admin` roles, `/settings/users`).

Route groups:

```
/api/v1/platform/auth/login          # public, strict rate limit
/api/v1/platform/auth/me             # platform JWT
/api/v1/platform/config/*            # CRUD global config
/api/v1/platform/plans/*             # CRUD plans
/api/v1/platform/promotions/*        # CRUD promotions
/api/v1/platform/landing-sections/*  # CRUD landing CMS
/api/v1/platform/tenants/*           # registry list/detail/actions
/api/v1/platform/stats/*             # aggregates
/api/v1/platform/audit-log           # read-only audit
```

Public consumers continue using `GET /api/v1/config/public` (merged YAML + DB, cached).

### 5. Web application

**Recommend `apps/admin`** — dedicated Next.js app on `admin.fieldforge.com` (add to `brand.domains` in config).

Rationale over `/admin/*` inside `apps/web`:

| Criterion | `apps/admin` | `/admin/*` in web |
|-----------|--------------|-------------------|
| Auth isolation | Separate cookie domain, no tenant session bleed | Shared origin with tenant app |
| Bundle / attack surface | Admin UI not shipped to field users | Larger tenant bundle |
| Precedent | Matches existing `apps/marketing` split | Conflates with `/settings` |
| Middleware | Simple: all routes require platform JWT | Must exclude from PWA/mobile shells |

### 6. Dynamic config resolution

Three-layer merge (highest wins unless `locked_in_yaml: true` on key):

```
app.config.yaml  →  DB (platform_config, plans, promotions, landing_sections)  →  in-process cache
```

- **Read path:** `ConfigResolver` loads YAML at boot, overlays DB rows, caches with 60s TTL (configurable); invalidate cache on platform-admin writes.
- **Write path:** Platform Admin UI persists to DB; writes `platform_audit_log` entry; publishes cache bust.
- **Fallback:** If DB unavailable, serve YAML-only (degraded mode, logged).
- **Bootstrap keys** (`security`, `debug`, JWT secrets) remain YAML/env-only — never editable via UI.

### 7. Statistics (phase 1 stubs)

| Metric | Source |
|--------|--------|
| `tenants_total` | `COUNT(*)` from `tenants` |
| `tenants_active` | `subscription_status IN ('active','trialing')` |
| `signups_7d` / `signups_30d` | `tenants.created_at` windows |
| `mrr_stub` | Sum of `plans.price_monthly` × active tenants per `plan_id` (no Stripe yet) |
| `active_modules` | `GROUP BY plugin_id` on `tenant_plugins WHERE enabled` |

## Consequences

### Positive

- Clear separation of platform operator vs tenant admin — reduces privilege-escalation risk.
- Dynamic pricing/landing without redeploy; YAML remains disaster-recovery fallback.
- Dedicated admin app aligns with marketing/web split and threat-model elevation controls.
- `tenant_registry` read model avoids cross-context table coupling in UI.

### Negative

- Additional app to deploy, monitor, and secure (`admin.fieldforge.com`).
- Platform tables bypass RLS — middleware bugs are critical; requires dedicated integration tests.
- Config merge adds complexity; cache invalidation must be tested.
- `super_admin` accounts need separate provisioning/runbook (no self-signup).

## Alternatives considered

1. **Tenant `users` with magic `tenant_id = platform`** — rejected: breaks RLS model, confuses RBAC, audit trail ambiguous.
2. **`/api/v1/admin/*` namespace** — rejected: naming collision with tenant workspace admin.
3. **`/admin/*` route group in `apps/web`** — rejected: shared origin, bundle bloat, auth/session coupling.
4. **DB-only config (drop YAML)** — rejected: no bootstrap without DB; YAML needed for cold start and IaC review.
5. **Plugin module (`plugins/platform-admin`)** — rejected for kernel concerns (auth bypass, cross-tenant reads); stays in `packages/core/platformadmin`.

## Referências

- [context-map.md](../domain/context-map.md)
- [platform-admin module spec](../modules/platform-admin.md)
- ADR-0002 (multitenant RLS)
- ADR-0001 (plugin-play — tenant plugins unchanged)
- `packages/core/auth/auth.go` — JWT stub to align
- `config/app.config.yaml` — bootstrap config
