# Platform Admin Module — Implementation Spec

> Uber-admin console for FieldForge operators. Separate from tenant workspace admin (`owner` / `admin`).
>
> **ADR:** [0005-platform-admin-boundary.md](../adr/0005-platform-admin-boundary.md)

## Goals

1. Cross-tenant visibility and limited tenant lifecycle actions
2. Edit plans, promotions, and landing content via UI (persisted DB + cache, YAML fallback)
3. Platform-level audit trail
4. Statistics dashboard (tenants, signups, MRR stub, module adoption)

## Non-goals (phase 1)

- Full Stripe billing reconciliation (MRR is stubbed)
- MFA for super admins (design hook only)
- Impersonation / “login as tenant” (phase 2, requires separate ADR)
- Editing `security`, `debug`, or secrets via UI

---

## Package layout

```
packages/core/platformadmin/
  migrations.go          # platform schema (versions 100–119)
  admin_repository.go    # platform_admins CRUD
  config_repository.go   # platform_config, plans, promotions, landing_sections
  tenant_registry.go     # read-only cross-tenant queries
  stats_service.go       # aggregates
  audit.go               # append-only platform  platform_audit_log
  config_resolver.go     # YAML + DB merge + cache
  service.go             # domain orchestration
  routes.go              # Fiber route registration
  middleware.go          # RequirePlatformAdmin

apps/admin/              # NEW Next.js 15 app (@fieldforge/admin)
  app/
    login/page.tsx
    (dashboard)/page.tsx
    config/page.tsx
    plans/page.tsx
    promotions/page.tsx
    landing/page.tsx
    tenants/page.tsx
    tenants/[id]/page.tsx
    audit/page.tsx
  lib/platform-api.ts

apps/api/internal/server/server.go   # mount platform routes (separate group)
```

---

## RBAC

### Roles

| Role | Scope | Permissions |
|------|-------|-------------|
| `super_admin` | Platform | Full platform admin (config, tenants, audit read, stats) |
| `support` | Platform | Read-only tenants + audit; no config writes (phase 2) |

Phase 1 implements **`super_admin` only**.

### Separation from tenant RBAC

| | Tenant `owner` | Platform `super_admin` |
|---|----------------|------------------------|
| Table | `users` | `platform_admins` |
| Manages | Own tenant users, billing, modules | All tenants, global config |
| API prefix | `/api/v1/*` (with `tenant_id`) | `/api/v1/platform/*` |
| Can access CRM/jobs/invoices? | Yes (own tenant) | No (unless impersonation ADR) |

Tenant `admin` role must never grant platform routes. Platform JWT rejected by `RequireTenant` middleware.

---

## Database schema (draft)

Migration band: **100–119** in `packages/core/platformadmin/migrations.go`.

### `platform_admins`

```sql
CREATE TABLE platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin'
    CHECK (role IN ('super_admin', 'support')),
  mfa_secret TEXT,
  disabled BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- NO RLS — access via platform DB role + application middleware only
```

### `platform_config`

```sql
CREATE TABLE platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  locked_in_yaml BOOLEAN NOT NULL DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES platform_admins(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Example keys: `brand.name`, `brand.tagline`, `contact.support_email`, `features.marketplace_plugins`.

### `plans`

```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2),
  price_yearly NUMERIC(10,2),
  stripe_price_id TEXT,
  description TEXT,
  badge TEXT,
  limits JSONB NOT NULL DEFAULT '{}',
  modules JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '[]',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Seed from `app.config.yaml` `pricing.plans` on first migration.

### `promotions`

```sql
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  plan_id TEXT REFERENCES plans(id),
  discount_percent NUMERIC(5,2),
  discount_amount NUMERIC(10,2),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `landing_sections`

```sql
CREATE TABLE landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT 'home',
  section_type TEXT NOT NULL,
  content JSONB NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page, slug)
);
```

Consumed by `apps/marketing` via public config or dedicated `GET /api/v1/config/public/landing`.

### `tenant_registry` (read model)

Option A — materialized view refreshed on schedule:

```sql
CREATE MATERIALIZED VIEW tenant_registry AS
SELECT
  t.id,
  t.slug,
  t.name,
  t.industry_pack,
  t.plan_id,
  t.subscription_status,
  t.created_at,
  (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count,
  (SELECT COUNT(*) FROM tenant_plugins tp
   WHERE tp.tenant_id = t.id AND tp.enabled) AS enabled_module_count
FROM tenants t;
```

Option B — table + event-driven refresh on `identity.tenant.*` events (preferred long-term).

### `platform_audit_log`

```sql
CREATE TABLE platform_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES platform_admins(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_platform_audit_created ON platform_audit_log (created_at DESC);
-- Append-only: revoke UPDATE/DELETE from app DB role
```

---

## API route map

Base: **`/api/v1/platform`**

All routes except login use `Auth` + `RequirePlatformAdmin`. Rate limit: **100 req/min per admin** (stricter than tenant).

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/platform/auth/login` | Public (IP rate limit) | Email/password → platform JWT |
| GET | `/platform/auth/me` | Platform JWT | Current admin profile |
| POST | `/platform/auth/logout` | Platform JWT | Client-side token discard (optional server denylist phase 2) |

### Config

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/config` | List all config keys (merged view: yaml source + db override) |
| GET | `/platform/config/:key` | Single key |
| PUT | `/platform/config/:key` | Upsert DB override (403 if `locked_in_yaml`) |
| DELETE | `/platform/config/:key` | Remove override → revert to YAML |
| POST | `/platform/config/cache/invalidate` | Bust resolver cache |

### Plans

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/plans` | List plans |
| GET | `/platform/plans/:id` | Plan detail |
| POST | `/platform/plans` | Create plan |
| PATCH | `/platform/plans/:id` | Update plan |
| DELETE | `/platform/plans/:id` | Soft-delete (`active = false`) |

### Promotions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/promotions` | List (filter `?active=true`) |
| POST | `/platform/promotions` | Create |
| PATCH | `/platform/promotions/:id` | Update |
| DELETE | `/platform/promotions/:id` | Deactivate |

### Landing sections

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/landing-sections` | List (`?page=home`) |
| POST | `/platform/landing-sections` | Create |
| PATCH | `/platform/landing-sections/:id` | Update |
| DELETE | `/platform/landing-sections/:id` | Delete |
| POST | `/platform/landing-sections/reorder` | Batch sort_order update |

### Tenants (registry)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/tenants` | Paginated list (`?q=`, `?plan=`, `?status=`) |
| GET | `/platform/tenants/:id` | Detail + modules + user count |
| PATCH | `/platform/tenants/:id` | Limited update: `plan_id`, `subscription_status`, feature_flags |
| GET | `/platform/tenants/:id/modules` | Enabled plugins |
| PATCH | `/platform/tenants/:id/modules` | Enable/disable plugin (audited) |

### Statistics popup audit

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/audit-log` | Paginated (`?actor=`, `?resource_type=`, `?from=`, `?to=`) |

### Statistics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/platform/stats/overview` | Dashboard aggregate |
| GET | `/platform/stats/signups` | Time series (`?interval=day&days=30`) |
| GET | `/platform/stats/modules` | Module adoption breakdown |
| GET | `/platform/stats/mrr` | MRR stub breakdown by plan |

#### `GET /platform/stats/overview` response shape

```json
{
  "tenants_total": 142,
  "tenants_active": 118,
  "tenants_trialing": 24,
  "signups_7d": 12,
  "signups_30d": 47,
  "mrr_stub_usd": 8942.00,
  "active_modules_top": [
    { "plugin_id": "crm", "tenant_count": 140 },
    { "plugin_id": "scheduling", "tenant_count": 132 }
  ],
  "as_of": "2026-06-25T12:00:00Z"
}
```

#### MRR stub algorithm

```
mrr_stub = Σ (active_tenant_count[plan_id] × plans.price_monthly[plan_id])
```

Exclude `enterprise` (custom pricing) unless `price_monthly` set. Mark response field `mrr_source: "stub"` until Stripe sync ADR.

### Public (unchanged, enhanced)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/config/public` | Merged brand + pricing + promotions + landing (cached) |

---

## Web route map — `apps/admin` (recommended)

Domain: **`admin.fieldforge.com`** (add to `brand.domains.admin` in config).

| Path | Page | Description |
|------|------|-------------|
| `/login` | Login | Platform admin sign-in |
| `/` | Dashboard | Stats overview cards |
| `/config` | Global config | Brand, contact, feature toggles |
| `/plans` | Plans | CRUD plan catalog |
| `/plans/[id]` | Plan detail | Edit single plan |
| `/promotions` | Promotions | Campaign management |
| `/landing` | Landing CMS | Section editor with preview link to marketing |
| `/tenants` | Tenant registry | Searchable table |
| `/tenants/[id]` | Tenant detail | Plan, modules, suspend |
| `/audit` | Audit log | Filterable platform actions |

### App shell

- Dark, minimal ops UI (reuse `@fieldforge/ui` tokens from config brand)
- No PWA / Capacitor / mobile shell
- Auth: store platform JWT in memory + HttpOnly cookie if same-site proxy; never mix with tenant token in `apps/web`

### Monorepo wiring

```json
// package.json workspaces — apps/admin added
"dev:admin": "npm run dev -w @fieldforge/admin"
```

Port: **3002** (web 3000, marketing 3001).

### Why not `/admin/*` in `apps/web`

See ADR-0005. Summary: tenant app already has `/settings/users` (workspace admin); separate origin prevents session confusion and keeps admin bundles off field-user devices.

---

## Middleware (Go)

```go
// RequirePlatformAdmin — after Auth
func RequirePlatformAdmin() fiber.Handler {
  return func(c *fiber.Ctx) error {
    claims := c.Locals("claims").(*auth.Claims)
    if !claims.IsPlatformAdmin || claims.Role != "super_admin" {
      return fiber.NewError(403, "platform admin required")
    }
    return c.Next()
  }
}

// RequireTenant — reject platform JWTs
func RequireTenant() fiber.Handler {
  // existing + if claims.IsPlatformAdmin { return 403 }
}
```

Platform route group **must not** call `RequireTenant`, `TenantHeader`, `PluginGate`, or `FeatureGate`.

DB access for platform routes uses a connection without `app.tenant_id` set, or a dedicated `platform_reader` role.

---

## Dynamic config resolver

### Merge order

1. Load `app.config.yaml` (+ env overlay) at process start
2. On each resolve (or cache miss): overlay `platform_config`, replace `pricing.plans` from `plans` table, attach active `promotions`, attach published `landing_sections`
3. Return merged struct for public API and internal services

### Cache

| Layer | TTL | Invalidation |
|-------|-----|----------------|
| In-process | 60s default | POST `/platform/config/cache/invalidate`, any plan/promotion/landing write |
| Future | Redis | Pub/sub `platform:config:invalidate` |

### Fallback

| Condition | Behavior |
|-----------|----------|
| DB down | Serve YAML-only; log `config_degraded=yaml_only` |
| Key missing in DB | Use YAML value |
| Key in DB | DB wins unless `locked_in_yaml=true` |

### UI-editable vs YAML-locked

| Editable via admin UI | YAML/env only |
|-----------------------|---------------|
| `brand.*` (except domains) | `brand.domains` |
| `pricing.plans.*` | `security.*` |
| `promotions` | `debug.*` |
| `landing_sections` | JWT secrets, Stripe secrets |
| `features.*` (global flags) | `integrations.*.env` |
| `contact.*` | Rate limit ceilings |

---

## Audit actions (canonical)

Format: `platform.{resource}.{action}`

| Action | Trigger |
|--------|---------|
| `platform.config.updated` | Config key PUT |
| `platform.plan.created` | Plan POST |
| `platform.plan.updated` | Plan PATCH |
| `platform.promotion.created` | Promotion POST |
| `platform.tenant.plan_changed` | Tenant PATCH plan_id |
| `platform.tenant.suspended` | subscription_status → suspended |
| `platform.tenant.module_toggled` | Module PATCH |
| `platform.admin.login` | Successful login |

---

## Security checklist

- [ ] Platform login rate limit: 5/min/IP + lockout after 10 failures
- [ ] Integration test: tenant JWT → `/platform/*` returns 403
- [ ] Integration test: platform JWT → `/api/v1/crm/*` returns 403
- [ ] Integration test: platform JWT → tenant A data via forged header returns nothing
- [ ] `platform_audit_log` append-only at DB permission level
- [ ] No platform routes in debug `expose_routes` without auth in production
- [ ] CORS: only `admin.fieldforge.com` for platform API credentials

---

## Implementation phases

### Phase 1 — Foundation

- Migrations + seed plans from YAML
- `platform_admins` + CLI seed
- Auth login/me
- `ConfigResolver` + enhance `/config/public`
- `apps/admin` login + dashboard stub

### Phase 2 — Content & registry

- Plans/promotions/landing CRUD (API + admin UI)
- Tenant registry list/detail
- Audit log

### Phase 3 — Stats & polish

- Stats endpoints + dashboard charts
- Cache invalidation hooks
- OpenAPI stubs in `docs/api/openapi.yaml`

---

## Acceptance criteria

1. Super admin can log in at `admin.fieldforge.com` with credentials distinct from any tenant user
2. Editing a plan price in admin UI reflects on marketing pricing page within cache TTL without redeploy
3. Tenant owner cannot call any `/api/v1/platform/*` endpoint
4. Platform admin cannot access tenant CRM data without future impersonation feature
5. Every config/plan/tenant mutation writes `platform_audit_log`
6. `/platform/stats/overview` returns tenant counts and MRR stub

---

## Related documents

- [ADR-0005](../adr/0005-platform-admin-boundary.md)
- [context-map.md](../domain/context-map.md)
- [glossary.md](../domain/glossary.md) — add `Platform Super Admin` term on implementation
- [api-security.md](../security/api-security.md)
- [threat-model.md](../security/threat-model.md)
