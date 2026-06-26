# Onboarding Module — Implementation Spec

> Post-signup wizard that provisions industry packs, company profile, modules, and optional integrations before the tenant workspace is fully active.
>
> **Bounded context:** Onboarding (see [context-map.md](../domain/context-map.md))

## Goals

1. Persist wizard progress per tenant in PostgreSQL (`onboarding_state`)
2. Provision enabled plugins and nav after completion
3. **API-only persistence when authenticated** — step advances require a successful API write; failures surface in the UI and block navigation
4. Industry pack catalog from config + `GET /industry-packs`

## Non-goals

- Offline-first onboarding (mobile queue does not apply to wizard steps)
- Skipping API persistence for authenticated users
- Cross-tenant onboarding state

---

## Persistence model

### Source of truth

| Context | Authority | Notes |
|---------|-----------|-------|
| Authenticated session (`ff_token` present) | **API** (`onboarding_state` table) | Every step save calls the matching endpoint; navigation happens only after success |
| Unauthenticated (edge case) | localStorage | Dev-only path; production flow always has a token after signup |

### localStorage keys (cache / bootstrap only)

| Key | Purpose |
|-----|---------|
| `ff_onboarding` | UI cache mirrored from API after successful reads/writes — **not** a silent fallback on save failure |
| `ff_onboarding_signup` | Signup form seed (`company_name`, `industry_pack`, `plan_id`) for profile step copy |

**Invariant:** When `token` is set, `useOnboarding` save handlers (`saveIndustry`, `saveProfile`, `saveModules`, `skipSetup`, `finish`) call the API. On error they set `error` via `formatErrorForUser`, rethrow, and the page **does not** call `router.push` to the next step.

On load, the hook hydrates from localStorage for instant paint, then replaces state from `GET /onboarding/status` when the API responds.

---

## Package layout

```
packages/core/onboarding/
  service.go           # Domain: load/save state, module preview, complete + nav
  handlers.go          # Fiber routes under /onboarding
  steps.go             # Step constants (signup, industry, profile, …)
  packs.go             # Industry pack list from config

apps/web/
  app/onboarding/      # Step pages (industry → profile → modules → setup → complete)
  lib/onboarding/
    use-onboarding.ts  # Hook: API saves, error state, no silent local fallback
    storage.ts         # API persist helpers + localStorage cache
    steps.ts           # UI step order and paths
  components/onboarding/
    onboarding-shell.tsx
    onboarding-stepper.tsx
```

---

## Wizard steps

| Step ID | Path | API mutation | Next step (on success) |
|---------|------|--------------|------------------------|
| `industry` | `/onboarding/industry` | `POST /onboarding/industry` | `profile` |
| `profile` | `/onboarding/profile` | `POST /onboarding/profile` | `modules` |
| `modules` | `/onboarding/modules` | `PATCH /onboarding/modules` | `setup` |
| `setup` | `/onboarding/setup` | `POST /onboarding/skip-setup` or integrations | `complete` |
| `complete` | `/onboarding/complete` | `POST /onboarding/complete` | `/dashboard` |

Signup creates initial row via `onboarding.CreateInitialState` from identity service (`current_step: industry`).

---

## API route map

Base: **`/api/v1/onboarding`** (authenticated — `RequireTenant`, bearer JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Current step, completed flags, profile, modules |
| POST | `/industry` | `{ industry_packs: string[] }` |
| POST | `/profile` | `{ state, team_size, logo_url }` |
| GET | `/modules/preview` | Enabled modules preview for tenant packs |
| PATCH | `/modules` | `{ modules: string[] }` |
| POST | `/skip-setup` | Mark setup skipped, advance step |
| POST | `/complete` | Finalize onboarding; returns `{ onboarding, nav }` |

Public (no auth):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/industry-packs` | Catalog from `app.config.yaml` |

---

## Web error handling

Each step page pattern:

```tsx
async function onContinue() {
  try {
    await saveIndustry(selected);
    router.push(stepPath(nextStep("industry")!));
  } catch {
    /* error surfaced via useOnboarding().error → ErrorBanner */
  }
}
```

`ErrorBanner` uses `role="alert"`. User remains on the current step URL until the API succeeds.

---

## Database

Table `onboarding_state` (per tenant, RLS by `tenant_id`):

- `current_step`, `completed_steps` (JSON array)
- `industry_packs`, `profile` (JSON), `modules`, `setup_skipped`
- `completed_at` when wizard finishes

---

## Testing

| Layer | Location |
|-------|----------|
| Go unit/integration | `packages/core/onboarding/*_test.go` |
| E2E — happy path | `tests/e2e/signup-login.spec.ts` (UI signup → full wizard) |
| E2E — API error blocks advance | `tests/e2e/onboarding-api-error.spec.ts` (mock `POST /onboarding/industry` → 500) |

Run tenant E2E (starts API + web):

```bash
npm run test:e2e -- tests/e2e/onboarding-api-error.spec.ts
```

---

## Acceptance criteria

1. New signup lands on `/onboarding/industry` with token and API-backed state
2. Each Continue action persists to API before route change
3. API failure shows user-visible error and **does not** advance step or write optimistic local-only state
4. `POST /onboarding/complete` enables nav items and sets `completed: true`
5. Reloading mid-wizard restores progress from `GET /onboarding/status` (localStorage is secondary)

---

## Related documents

- [glossary.md](../domain/glossary.md) — Tenant, Industry pack
- [api-security.md](../security/api-security.md)
- [openapi.yaml](../api/openapi.yaml)
