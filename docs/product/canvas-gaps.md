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

> **Innexar Field Sprint (2026-06-26):** 7 of 8 feature agents shipped. See [sprint-status.md](./sprint-status.md).

| Rank | Gap | Canvas says | Reality | Severity |
|------|-----|-------------|---------|----------|
| 1 | **Customer portal (`portal cliente`)** | F1 “Client Portal” = completed | Backend: magic-link auth + `GET /portal/me`, `/portal/invoices` (`packages/plugins/portal/`). **Web routes still `PortalStubPage`**; `PortalAuthProvider` wired in layout only | **P0** |
| 2 | **Production Stripe / QuickBooks** | Integrations in catalog | Mock by default (`MockStripe`, `MockQuickBooks`); settings page shows “dev stub” | **P1** |
| 3 | **Server invoice PDF / email** | F4 Invoicing = completed | Branded **print preview** at `/invoices/[id]/preview`; no server-rendered PDF or email attachment | **P1** |
| 4 | **Crews ↔ payroll employees** | F3 Scheduling | `crews` = name, `lead_name`, `member_count`; no employee FKs | **P1** |
| 5 | **Estimate PDF (beyond print)** | SAL-002 | `/estimates/[id]/preview` + `window.print()`; no server PDF / email attachment | **P1** |
| 6 | **Communications module** | Catalog = `new` | No SMS/email templates, `/portal/messages` stub, no Twilio | **P1** |
| 7 | **SDLC Figma / design system** | `sdlc3` = pending | Still pending — accurate | **P1** |
| 8 | **Capacitor native shell** | Mobile tab describes `apps/native` | **`apps/native` does not exist** | **P2** |
| 9 | **Super-admin `/admin/tenants`** | WEB_SCREENS | Route not implemented; ADR-0005 docs only | **P2** |

### Closed in Innexar Field Sprint (was P0)

| Gap | Delivered |
|-----|-----------|
| Employee portal — “my jobs” | `jobs.assigned_to` migration; `GET /jobs?mine=true`; `/m/jobs` filters by linked employee |
| Work order assignment UI | Assign technician on dispatch board + `/work-orders/[id]` |
| Google Maps navigation | `apps/web/lib/maps.ts`, `NavigateButton`; deep links on job cards, routes, schedule map, work orders |
| Property beds/baths/sqft | CRM migration + CRUD; properties UI with bedrooms/bathrooms/sqft |
| Price book + estimate room tiers | `POST /estimates/:id/calculate` applies `pricing_tiers` from linked property; price-book tier editor UI |
| Employee ↔ user link | `employees.user_id` migration; `PATCH /employees/:id`; `/payroll/employees` link UI; timesheets auto-resolve employee |
| Invoice print preview | `/invoices/[id]/preview` branded layout + print from detail page |

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
| **p1** F1 Core + CRM + Portal | pending | **partial** | Auth/CRM done; portal **API** (magic-link, customer invoices); **portal web pages = stubs** |
| **p2** F2 Estimates + Price Book | pending | **partial** | Estimates/takeoff/price-book CRUD; **room-tier calculate** from property; price-book tier editor |
| **p3** F3 Scheduling + Dispatch | pending | **partial** | Schedule, crews, routes; **dispatch assign UI**; **Google Maps deep links** on map/routes/jobs |
| **p4** F4 Expenses + Invoicing | pending | **partial** | CRUD + payments; **invoice print preview**; no server PDF; expenses basic (no OCR) |
| **p5** F5 Cleaning | pending | **partial** | QC/supplies API (`packages/plugins/cleaning/`); web badges “Stub”; `PhotoUploadStub` |
| **p6** F6 Construction | pending | **partial** | CO workflow API+UI solid; `DailyLogPhotoStub`; permit alerts in plugin |
| **p7** F7 PWA campo | pending | **partial** | Offline queue, SW v3; **`/m/jobs?mine` filter**; maps navigate on job detail; signature/vehicle/profile stubs |
| **p8** F8 Accounting + Payroll | pending | **partial** | GL/AP/AR list endpoints; payroll runs + W-4; **`employees.user_id` link + `/payroll/employees` UI** |

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
| CRM | customers, leads, properties (beds/baths/sqft) | contracts + templates | — | — |
| Estimates | list, builder, calculate (room tiers), preview/print | send flow | — | server PDF |
| Finance | invoices list, expenses, job-costing, invoice print preview | invoice detail | accounting lists | server PDF, expenses OCR |
| Payroll | employees, runs, tax, timesheets, employee↔user link | — | — | — |
| Schedule/Dispatch | schedule, recurring, routes, crews, dispatch assign, maps links | schedule map (grid + navigate) | — | live map embed |
| Cleaning | jobs, phases | supplies, QC (API ok, UI “Stub”) | photo upload | — |
| Construction | projects, CO, permits, RFIs, subs | daily-log photos | — | — |
| PWA `/m/*` | jobs list/detail (mine filter), time, expenses, sync, maps navigate | offline queue | signature, vehicle, profile | — |
| **Portal cliente** | hub preview cards; portal API (magic-link) | — | **login, bookings, payments, documents, messages, profile, support** (web stubs) | customer-facing pages |
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
| **Employee portal** | **partial** | `/m/jobs?mine`, maps navigate, offline sync; signature/vehicle stubs remain |
| **Contract templates** | **partial** | 3 US templates seeded (`packages/plugins/crm/templates.go`); UI at `/contracts` with template picker |
| **PDF invoices** | **partial** | Branded print preview at `/invoices/[id]/preview`; no server PDF or email attachment |
| **Room pricing** | **partial** | Property beds/baths + price-book tiers + calculate applies room pricing; estimate builder property picker TBD |
| **Integrations** | **stub** | QB/Stripe/Avalara routes; mock without env keys |
| **Portal cliente** | **partial** | API + auth context shipped; web routes still `PortalStubPage`; public quote at `/p/[token]` works |

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

### Wave 1 — Daily ops & revenue ✅ (sprint 2026-06-26)

1. ~~Work order detail page + assignment UI~~ → dispatch board + `/work-orders/[id]`
2. ~~`jobs.assigned_to` / filter `/m/jobs` by logged-in user~~
3. ~~Google Maps deep links on job cards, routes, schedule map~~
4. ~~Dispatch board: assign technician from board~~

### Wave 2 — Sales & CRM ✅ (sprint 2026-06-26)

5. ~~Property fields: beds, baths, sqft on `customer_properties` + UI~~
6. ~~Price book tier editor + calculate from property~~
7. Branded estimate print/PDF polish (extend existing preview)
8. Customer UX guided flows (expand hints on `/customers`)

### Wave 3 — Finance & client portal (in progress)

9. ~~Branded invoice print preview~~ → server PDF + email attachment remains
10. Customer portal v1: **API done**; wire web pages (login, invoices, pay) to `PortalAuthProvider`
11. Stripe Connect production path (real keys, webhooks)

### Wave 4 — Integrations & platform depth

12. QuickBooks OAuth production + sync
13. ~~Employee ↔ user link~~ → crew membership FKs remain
14. Communications (email/SMS templates)
15. Capacitor shell + native signature/camera
16. Super-admin tenant management
17. SDLC Figma design system

---

## Key evidence paths

| Feature | Routes / files |
|---------|----------------|
| Portal stubs | `apps/web/app/portal/*/page.tsx`, `apps/web/components/portal-stub-page.tsx` |
| Portal API | `packages/plugins/portal/`, `apps/web/lib/portal-auth-context.tsx` |
| Maps deep links | `apps/web/lib/maps.ts`, `apps/web/components/maps/navigate-button.tsx` |
| Employee link | `packages/plugins/payroll/plugin.go` (migration 201), `apps/web/app/payroll/employees/page.tsx` |
| Jobs mine filter | `packages/plugins/scheduling/plugin.go` (`mine`, `assigned_to`), `apps/web/app/m/jobs/page.tsx` |
| Room pricing calc | `packages/plugins/estimating/pricing.go`, `plugin.go` calculate |
| Invoice preview | `apps/web/app/invoices/[id]/preview/page.tsx` |
| Dispatch assign | `apps/web/app/dispatch/page.tsx`, `apps/web/app/work-orders/[id]/page.tsx` |
| Property beds/baths | `packages/plugins/crm/plugin.go` (migration 105), properties UI |
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
