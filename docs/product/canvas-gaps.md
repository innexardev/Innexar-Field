# Canvas vs Codebase Gap Analysis

> Product audit comparing the architectural canvas (`docs/canvases/erp-field-services-plan.canvas.tsx`) to the FieldForge codebase.  
> Related: [ERP Backlog v2](./erp-backlog-v2.md) · Canvas plan · Last reviewed: 2026-06-26.

## Purpose

The ERP plan canvas tracks MVP phases (F0–F8), engineering foundations, landing/GTM, and web screen coverage. This document records where canvas status overstated delivery and what remains to reach the product vision (employee portal, client portal, room pricing, branded PDFs, production integrations).

**Status legend**

| Label | Meaning |
|-------|---------|
| **done** | Shipped end-to-end; usable in production without stubs |
| **partial** | Core CRUD or API exists; key UX or integrations missing |
| **stub** | Route or handler present; returns placeholder or mock |
| **missing** | No meaningful implementation |

Canvas `MVP_TASKS` only supports `completed` \| `pending`. Items marked **partial** in this doc are shown as `pending` on the canvas with “parcial” in the task text.

---

## Executive summary — top 15 gaps (ranked)

| Rank | Gap | Canvas says | Reality | Severity |
|------|-----|-------------|---------|----------|
| 1 | **Customer portal (`portal cliente`)** | F1 “Client Portal” = completed | `/portal/*` customer routes are `PortalStubPage` (“Coming soon”); hub links to admin `/estimates`, `/invoices`, `/customers` | **P0** |
| 2 | **Employee portal — “my jobs”** | F7 PWA = completed | `/m/jobs` lists **all tenant jobs** for today; no `user_id` / `technician_id` on `jobs` table | **P0** |
| 3 | **Work order assignment UI** | F3 Dispatch = completed | API: `POST /dispatch/work-orders/:id/assignments`; SDK has `createWorkOrderAssignment`; **no web UI**; no `/work-orders/[id]` | **P0** |
| 4 | **Google Maps navigation** | OPS-002/003 in backlog | Zero `maps.google` / directions links; `/schedule/map` is CSS grid fake map | **P0** |
| 5 | **Branded invoice PDF** | F4 Invoicing = completed | `/invoices/[id]` — send/pay only; no PDF export or print layout | **P0** |
| 6 | **Property beds/baths/sqft (CRM)** | CRM-001 | `customer_properties` has address only; SDK `Property` has no beds/baths/sqft | **P0** |
| 7 | **Price book beds/baths pricing** | F2 Price Book = completed | API has `pricing_model` + `pricing_tiers` (beds/baths); UI is flat `unit_price_cents` only | **P0** |
| 8 | **Employee ↔ user account link** | F8 Payroll = completed | `employees` has no `user_id`; timesheets pick first active employee | **P0** |
| 9 | **Production Stripe / QuickBooks** | Integrations in catalog | Mock by default (`MockStripe`, `MockQuickBooks`); settings page shows “dev stub” | **P1** |
| 10 | **Crews ↔ payroll employees** | F3 Scheduling | `crews` = name, `lead_name`, `member_count`; no employee FKs | **P1** |
| 11 | **Estimate PDF (beyond print)** | SAL-002 | `/estimates/[id]/preview` + `window.print()`; no server PDF / email attachment | **P1** |
| 12 | **Communications module** | Catalog = `new` | No SMS/email templates, `/portal/messages` stub, no Twilio | **P1** |
| 13 | **SDLC Figma / design system** | `sdlc3` = pending | Still pending — accurate | **P1** |
| 14 | **Capacitor native shell** | Mobile tab describes `apps/native` | **`apps/native` does not exist** | **P2** |
| 15 | **Super-admin `/admin/tenants`** | WEB_SCREENS | Route not implemented; ADR-0005 docs only | **P2** |

---

## Status by canvas node

### `MVP_TASKS` (F0–F8 + engineering + landing)

| Node | Canvas `status` (after correction) | Assessment | Evidence |
|------|-----------------------------------|------------|----------|
| **sdlc1** | completed | **done** | `docs/domain/*`, `docs/adr/*`, engineering docs |
| **sdlc3** | pending | **missing** | Figma/design system not started |
| **eng1–eng4** | completed | **done** | ADRs, security, SRE, `.github/workflows/ci.yml`, validate scripts |
| **eng5** | completed | **done** | `packages/core/resilience/`, `packages/core/events/outbox.go`, `packages/core/middleware/idempotency.go`, poller in `apps/api/cmd/server/main.go` |
| **land** | pending | **partial** | `apps/marketing/app/` (~15 pages); `POST /public/contact` stub (`handlers.go`: “no email send yet”) |
| **p0** F0 Onboarding | completed | **partial** | Wizard: `apps/web/app/onboarding/*`, `packages/core/onboarding/`; `/marketplace` = “Coming soon” |
| **p1** F1 Core + CRM + Portal | pending | **partial** | Auth/CRM done; **portal cliente = stubs** (`apps/web/components/portal-stub-page.tsx`) |
| **p2** F2 Estimates + Price Book | pending | **partial** | Estimates/takeoff/price-book CRUD; **no beds/baths tier UI**; calculate = markup/tax only |
| **p3** F3 Scheduling + Dispatch | pending | **partial** | Schedule, crews, routes API; dispatch board **read-only**; assignment API **no UI** |
| **p4** F4 Expenses + Invoicing | pending | **partial** | CRUD + payments; **no invoice PDF**; expenses basic (no OCR) |
| **p5** F5 Cleaning | pending | **partial** | QC/supplies API (`packages/plugins/cleaning/`); web badges “Stub”; `PhotoUploadStub` |
| **p6** F6 Construction | pending | **partial** | CO workflow API+UI solid; `DailyLogPhotoStub`; permit alerts in plugin |
| **p7** F7 PWA campo | pending | **partial** | Offline queue (`apps/web/lib/mobile/offline-queue.ts`), SW v3 (`public/sw.js`); signature/vehicle/profile stubs |
| **p8** F8 Accounting + Payroll | pending | **partial** | GL/AP/AR list endpoints; payroll runs + W-4; **no employee-user link** |

### `eng5` (resilience + outbox + idempotency)

| Item | Status | Evidence |
|------|--------|----------|
| Circuit breaker / bulkhead | **done** | `packages/core/resilience/` |
| Outbox pattern | **done** | `packages/core/events/outbox.go`, `poller.go`; plugins register handlers |
| Idempotency middleware | **done** | `packages/core/middleware/idempotency.go`; migration in core + invoicing |
| Saga / rate limiting / Grafana | **partial/missing** | Canvas engineering tab still lists pending |

### `land` (Landing/GTM)

| Item | Status | Evidence |
|------|--------|----------|
| Marketing site | **partial** | `apps/marketing/app/page.tsx`, `/pricing`, `/industries/[slug]`, `/blog`, `/referral` |
| Blog CMS config | **done** | `config/marketing-content.yaml`, `apps/marketing/app/lib/marketing-content.ts` |
| Contact API | **stub** | `apps/api/internal/public/handlers.go` |
| Analytics GTM | **missing** | No gtag/analytics wiring found |

### `WEB_SCREENS` (by area — summary)

| Area | Done | Partial | Stub | Missing |
|------|------|---------|------|---------|
| Marketing | home, pricing, industries, blog, legal | contact (no backend email) | — | — |
| Onboarding | 5-step wizard | setup/complete | marketplace | — |
| Dashboard | owner/dispatcher/accountant pages | KPIs may be seeded | — | role widgets depth |
| CRM | customers, leads, properties (address) | contracts + templates | — | beds/baths on properties |
| Estimates | list, builder, calculate, preview/print | send flow | — | beds/baths calc |
| Finance | invoices list, expenses, job-costing | invoice detail | accounting lists | invoice PDF, expenses OCR |
| Payroll | employees, runs, tax, timesheets | — | — | employee↔user |
| Schedule/Dispatch | schedule, recurring, routes, crews | map (fake), dispatch (read-only) | — | assign UI, Google Maps |
| Cleaning | jobs, phases | supplies, QC (API ok, UI “Stub”) | photo upload | — |
| Construction | projects, CO, permits, RFIs, subs | daily-log photos | — | — |
| PWA `/m/*` | jobs list/detail, time, expenses, sync | offline queue | signature, vehicle, profile | maps link |
| **Portal cliente** | hub preview cards | — | **login, bookings, payments, documents, messages, profile, support** | self-service auth |
| Settings | users, modules, integrations UI | integrations mock | templates route | `/settings/templates` |
| Admin SaaS | — | — | — | `/admin/tenants` |

### Vision gaps (catalog / engineering tabs)

Vision gap analysis lives in the canvas (not a separate constant):

- **Catalog tab:** “Analise de gaps — o que faltava”
- **Engineering tab:** `EngineeringGapsTab`
- **Overview callouts:** resilience, portal, and integration gaps

**Modules still “new” in catalog vs codebase:**

| Module (catalog) | Codebase |
|------------------|----------|
| notifications | Hardcoded demo in `server.go` `/notifications` |
| file-storage | `storage` package + upload routes — **partial** |
| integrations-hub | `packages/integrations/` — **stub/mock** |
| client-portal | **stub pages only** |
| communications | **missing** |
| fleet | `/m/vehicle` stub |
| documents (RFIs) | RFIs page exists; full doc mgmt missing |
| admin-saas | **missing** |
| mobile-core / Capacitor | PWA only; no `apps/native` |

---

## User vision comparison

| Vision item | Status | Notes |
|-------------|--------|-------|
| **Employee portal** | **partial** | `/m/jobs`, `/m/time`, offline sync work; not filtered per employee; no maps |
| **Contract templates** | **partial** | 3 US templates seeded (`packages/plugins/crm/templates.go`); UI at `/contracts` with template picker |
| **PDF invoices** | **missing** | No PDF generation; estimate has HTML print preview only |
| **Room pricing** | **partial** | Takeoff sqft-by-room (`/takeoff`); price book tiers in API not exposed in UI |
| **Integrations** | **stub** | QB/Stripe/Avalara routes; mock without env keys |
| **Portal cliente** | **stub** | All 7 customer routes use `PortalStubPage`; public quote at `/p/[token]` is the only real client-facing flow |

---

## Recommended canvas `MVP_TASKS` status corrections

Applied in `erp-field-services-plan.canvas.tsx` (2026-06-26):

| Node | Was | Now | Rationale |
|------|-----|-----|-----------|
| `land` | completed | **pending** | Contact API stub; analytics missing |
| `p1` | completed | **pending** | Client portal routes are stubs |
| `p2`–`p8` | completed | **pending** | Substantial partial delivery; canvas has no `partial` status |
| `eng5`, `sdlc1`, `eng1`–`eng4` | completed | **completed** | Accurate |
| `sdlc3` | pending | **pending** | Figma/design system not started |

`p0` remains **completed** (onboarding wizard shipped; marketplace stub noted in content only).

---

## Recommended implementation order (waves 1–4)

### Wave 1 — Daily ops & revenue

Aligns with backlog Sprints 1–2.

1. Work order detail page + assignment UI → wire `createWorkOrderAssignment`
2. `jobs.assigned_to` / filter `/m/jobs` by logged-in user
3. Google Maps deep links on job cards, routes, schedule map
4. Dispatch board: assign technician from board

### Wave 2 — Sales & CRM

Sprint 3 + CRM-001/002.

5. Property fields: beds, baths, sqft on `customer_properties` + UI
6. Price book tier editor (beds/baths) + calculate from property
7. Branded estimate print/PDF polish (extend existing preview)
8. Customer UX guided flows (expand hints on `/customers`)

### Wave 3 — Finance & client portal

9. Branded invoice PDF (server render or print CSS)
10. Customer portal v1: magic-link auth, view/pay invoices, accept quotes
11. Stripe Connect production path (real keys, webhooks)

### Wave 4 — Integrations & platform depth

12. QuickBooks OAuth production + sync
13. Employee ↔ user link + crew membership
14. Communications (email/SMS templates)
15. Capacitor shell + native signature/camera
16. Super-admin tenant management
17. SDLC Figma design system

---

## Key evidence paths

| Feature | Routes / files |
|---------|----------------|
| Portal stubs | `apps/web/app/portal/*/page.tsx`, `apps/web/components/portal-stub-page.tsx` |
| Public quote (works) | `apps/web/app/p/[token]/page.tsx`, `packages/plugins/estimating/public.go` |
| Assignment API | `packages/plugins/dispatch/plugin.go` (assignments routes) |
| Outbox/idempotency | `packages/core/events/`, `packages/core/middleware/idempotency.go` |
| Contract templates | `packages/plugins/crm/templates.go`, `apps/web/app/contracts/page.tsx` |
| Integrations mock | `packages/integrations/quickbooks.go`, `stripeconnect.go` |
| Onboarding | `packages/core/onboarding/service.go`, `apps/web/app/onboarding/` |
| Marketing | `apps/marketing/app/` |
| Contact stub | `apps/api/internal/public/handlers.go` |
| Employee PWA | `apps/web/app/m/jobs/page.tsx`, `apps/web/lib/mobile/offline-queue.ts` |
| Price book API tiers | `packages/plugins/estimating/plugin.go` (`pricing_model`, `pricing_tiers`) |

---

## Maintenance

Re-run this audit when:

- A canvas phase moves from `pending` to `completed`
- New modules ship in `packages/plugins/`
- Client or employee portal routes leave stub state

Update this file and canvas `MVP_TASKS` in the same PR when closing a wave item.
