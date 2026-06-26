# Canvas vs Codebase Gap Analysis

> Product audit comparing the architectural canvas (`docs/canvases/erp-field-services-plan.canvas.tsx`) to the FieldForge codebase.  
> Related: [ERP Backlog v2](./erp-backlog-v2.md) · Canvas plan · Last reviewed: 2026-06-26 (wave 1+2 complete).

## Purpose

The ERP plan canvas tracks MVP phases (F0–F8), engineering foundations, landing/GTM, and web screen coverage. This document records where canvas status overstated delivery and what remains to reach the product vision (employee portal, client portal, room pricing, branded PDFs, production integrations).

**Maturity estimate (2026-06-26):** ~68–72% toward canvas MVP vision.

**Status legend**

| Label | Meaning |
|-------|---------|
| **done** | Shipped end-to-end; usable in production without stubs |
| **partial** | Core CRUD or API exists; key UX or integrations missing |
| **stub** | Route or handler present; returns placeholder or mock |
| **missing** | No meaningful implementation |

Canvas `MVP_TASKS` only supports `completed` \| `pending`. Items marked **partial** in this doc are shown as `pending` on the canvas with “parcial” in the task text.

---

## Executive summary — top 10 remaining gaps (ranked)

> **Gap review (2026-06-26, wave 1+2):** Portal v1 (bookings/messages/support), communications, notifications, Stripe production path, photo upload, and server PDF shipped. See [sprint-status.md](./sprint-status.md).

| Rank | Gap | Canvas says | Reality | Severity |
|------|-----|-------------|---------|----------|
| 1 | **Server PDF + email** | F4 Invoicing = partial | Branded **print preview** at `/invoices/[id]/preview` + estimate preview; no server-rendered PDF or email attachment | **P1** |
| 2 | **Stripe Connect / QuickBooks production** | Integrations in catalog | Mock by default (`MockStripe`, `MockQuickBooks`); settings page shows “dev stub”; SaaS billing webhooks exist but need live keys | **P1** |
| 3 | **Portal cliente — remaining stubs** | F1 “Client Portal” = pending | **Core implemented:** login (magic-link), invoices, payments, documents, profile. **Stubs:** bookings, messages, support; portal pay still mock without live Stripe | **P1** |
| 4 | **Communications module** | Catalog = `new` | No SMS/email templates, `/portal/messages` stub, no Twilio; `/settings/templates` missing | **P1** |
| 5 | **Property picker in estimate builder** | F2 partial | `POST /estimates/:id/calculate` works when `property_id` set; builder lacks property picker to set it before calculate | **P1** |
| 6 | **Crews ↔ payroll employees** | F3 Scheduling | `crews` = name, `lead_name`, `member_count`; no employee FKs | **P1** |
| 7 | **Photo upload (cleaning / construction)** | F5/F6 partial | `PhotoUploadStub`, `DailyLogPhotoStub` — no real camera/upload | **P2** |
| 8 | **Capacitor native features** | Mobile tab | Capacitor scaffold in `apps/web` (ios/android); no `apps/native`; `/m/signature`, `/m/vehicle` stub | **P2** |
| 9 | **SDLC Figma / design system** | `sdlc3` = pending | Still pending — accurate | **P1** |
| 10 | **Notifications (real backend)** | Catalog = `new` | Hardcoded demo in `server.go` `/notifications`; no robust module | **P2** |

Honorable mentions: expenses OCR, live map embed / fleet GPS, marketplace onboarding, marketing analytics GTM, e-signature on proposals, purchase orders.

### Closed P0 items (sprint 2026-06-26 + follow-up)

| Gap | Delivered |
|-----|-----------|
| Employee portal — “my jobs” | `jobs.assigned_to` migration; `GET /jobs?mine=true`; `/m/jobs` filters by linked employee |
| Work order assignment UI | Assign technician on dispatch board + `/work-orders/[id]` |
| Google Maps navigation | `apps/web/lib/maps.ts`, `NavigateButton`; deep links on job cards, routes, schedule map, work orders |
| Property beds/baths/sqft | CRM migration + CRUD; properties UI with bedrooms/bathrooms/sqft |
| Price book + estimate room tiers | `POST /estimates/:id/calculate` applies `pricing_tiers` from linked property; price-book tier editor UI |
| Employee ↔ user link | `employees.user_id` migration; `PATCH /employees/:id`; `/payroll/employees` link UI; timesheets auto-resolve employee |
| Invoice print preview | `/invoices/[id]/preview` branded layout + print from detail page |


### Wave 1+2 shipped (2026-06-26)

| Area | Delivered |
|------|-----------|
| **Portal v1 complete** | `/portal/bookings`, `/portal/messages`, `/portal/support` + API (`bookings.go`, `messages.go`, `support.go`, migration 134) |
| **Communications v1** | `packages/plugins/communications/` — templates, transactional email; `/settings/templates` |
| **Notifications** | `packages/core/notifications/` — persisted list + mark read (replaces demo handler) |
| **Stripe production path** | `packages/core/billing/stripe_config.go` — env + platform_settings; mock gated on debug + missing secret |
| **Photo upload** | Real upload components + storage multipart; cleaning QC + construction daily logs |
| **Server PDF** | `packages/plugins/invoicing/pdf.go`, `packages/plugins/estimating/pdf.go` + download helper |
| **Property picker** | `EstimatePropertyPicker` in estimate wizard before calculate |

### Shipped since prior gap doc (not P0 blockers)

| Area | Delivered |
|------|-----------|
| **Portal web core** | `/portal/login`, `/portal/invoices`, `/portal/payments`, `/portal/documents`, `/portal/profile` — wired to `PortalAuthProvider` and `packages/plugins/portal/` |
| **Admin SaaS** | `apps/admin` — platform console: dashboard+MRR, tenants, users, plans, billing-settings, integrations, modules, audit (`/platform/*` API) |
| **Billing post-signup + dunning** | Signup → `/onboarding/billing` → `createCheckout`; `subscription-guard`; `/billing/dunning`; webhooks in `packages/core/billing/` |
| **Dashboard KPIs** | `/dashboard` loads via `listReportKpis()`; role dashboards (owner/dispatcher/accountant) |
| **Platform migrations 202–205** | `platform_billing_settings`, `platform_user_admin`, `platform_settings`, `platform_seed_default_plans` in `packages/core/platform/migrations.go` |

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
| **p0** F0 Onboarding | completed | **partial** | Wizard + `/onboarding/billing` checkout; `/marketplace` = “Coming soon” |
| **p1** F1 Core + CRM + Portal | completed | **done** | Auth/CRM + **portal web v1** (login, invoices, Stripe pay, documents, profile, bookings, messages, support); admin SaaS |
| **p2** F2 Estimates + Price Book | pending | **partial** | Estimates/takeoff/price-book CRUD; **room-tier calculate** from property; price-book tier editor; property picker TBD |
| **p3** F3 Scheduling + Dispatch | pending | **partial** | Schedule, crews, routes; **dispatch assign UI**; **Google Maps deep links** on map/routes/jobs |
| **p4** F4 Expenses + Invoicing | pending | **partial** | CRUD + payments; **invoice print preview**; no server PDF; expenses basic (no OCR) |
| **p5** F5 Cleaning | pending | **partial** | QC/supplies API; **real photo upload** on cleaning jobs |
| **p6** F6 Construction | pending | **partial** | CO workflow API+UI solid; **real daily-log photo upload**; permit alerts in plugin |
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
| Onboarding | 5-step wizard, billing checkout | setup/complete | marketplace | — |
| Dashboard | owner/dispatcher/accountant pages, KPIs via API | role widgets depth | — | — |
| CRM | customers, leads, properties (beds/baths/sqft) | contracts + templates | — | — |
| Estimates | list, builder, calculate (room tiers), preview/print | send flow, property picker | — | server PDF |
| Finance | invoices list, expenses, job-costing, invoice print preview | invoice detail | accounting lists | server PDF, expenses OCR |
| Payroll | employees, runs, tax, timesheets, employee↔user link | — | — | — |
| Schedule/Dispatch | schedule, recurring, routes, crews, dispatch assign, maps links | schedule map (grid + navigate) | — | live map embed |
| Cleaning | jobs, phases | supplies, QC (API ok, UI “Stub”) | photo upload | — |
| Construction | projects, CO, permits, RFIs, subs | daily-log photos | — | — |
| PWA `/m/*` | jobs list/detail (mine filter), time, expenses, sync, maps navigate | offline queue | signature, vehicle, profile | — |
| **Portal cliente** | login, invoices, payments, documents, profile, hub, **bookings, messages, support** | Connect onboarding depth | — | — |
| Settings | users, modules, integrations UI, **`/settings/templates`** | integrations mock (QB) | — | SMS/Twilio |
| **Admin SaaS** | `apps/admin` — tenants, users, plans, dashboard, billing, integrations, audit | polish / live metrics | — | — |
| Billing (tenant SaaS) | checkout, dunning, subscription guard, status API | live Stripe keys | — | — |

### Vision gaps (catalog / engineering tabs)

Vision gap analysis lives in the canvas (not a separate constant):

- **Catalog tab:** “Analise de gaps — o que faltava”
- **Engineering tab:** `EngineeringGapsTab`
- **Overview callouts:** resilience, portal, and integration gaps

**Modules still “new” in catalog vs codebase:**

| Module (catalog) | Codebase |
|------------------|----------|
| notifications | **`packages/core/notifications/`** — tenant-scoped API |
| file-storage | `storage` package + **multipart upload** — **partial** |
| integrations-hub | `packages/integrations/` — **stub/mock** |
| client-portal | **done** — portal v1 including bookings/messages/support |
| communications | **partial** — email/templates v1; SMS pending |
| fleet | `/m/vehicle` stub |
| documents (RFIs) | RFIs page exists; full doc mgmt missing |
| admin-saas | **`apps/admin`** — platform console shipped |
| mobile-core / Capacitor | PWA + Capacitor scaffold in `apps/web`; no `apps/native` |

### Platform migrations (202–205)

Registered in `packages/core/platform/migrations.go`:

| Version | Name | Purpose |
|---------|------|---------|
| 202 | `platform_billing_settings` | Checkout URLs, billing config for platform |
| 203 | `platform_user_admin` | Platform operator user management |
| 204 | `platform_settings` | Global platform config |
| 205 | `platform_seed_default_plans` | Default subscription plans seed |

---

## User vision comparison

| Vision item | Status | Notes |
|-------------|--------|-------|
| **Employee portal** | **partial** | `/m/jobs?mine`, maps navigate, offline sync; signature/vehicle stubs remain |
| **Contract templates** | **partial** | 3 US templates seeded (`packages/plugins/crm/templates.go`); UI at `/contracts` with template picker |
| **PDF invoices** | **partial** | Print preview + **server PDF** render; email attachment flow TBD |
| **Room pricing** | **partial** | Property beds/baths + tiers + calculate; **property picker** in estimate builder |
| **Integrations** | **partial** | Stripe production key resolver; QB still mock without OAuth; SaaS billing webhooks implemented |
| **Portal cliente** | **done** | Full portal v1 including bookings, messages, support; Stripe pay with production key path; public quote at `/p/[token]` |
| **Admin SaaS** | **partial** | `apps/admin` with full platform console; polish and live metrics remain |
| **Billing post-signup** | **done** | Onboarding billing step + dunning page + subscription guard |

---

## Recommended canvas `MVP_TASKS` status corrections

Applied in `erp-field-services-plan.canvas.tsx` (2026-06-26, updated gap review):

| Node | Was | Now | Rationale |
|------|-----|-----|-----------|
| `land` | completed | **pending** | Contact API stub; analytics missing |
| `p1` | pending | **completed** | Portal web v1 complete — bookings, messages, support + Stripe pay |
| `p2`–`p8` | completed | **pending** | Substantial partial delivery; canvas has no `partial` status |
| `eng5`, `sdlc1`, `eng1`–`eng4` | completed | **completed** | Accurate |
| `sdlc3` | pending | **pending** | Figma/design system not started |

`p0` remains **completed** (onboarding wizard + billing checkout shipped; marketplace stub noted in content only).

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

9. ~~Branded invoice print preview~~ → ~~server PDF~~ shipped; email attachment remains
10. ~~Customer portal v1~~ → **complete** (bookings, messages, support, Stripe production path)
11. ~~Billing post-signup + dunning~~ → ~~Stripe SaaS production key path~~; Connect tenant UX remains
12. Stripe Connect production path (real keys, webhooks)

### Wave 4 — Integrations & platform depth

13. QuickBooks OAuth production + sync
14. ~~Employee ↔ user link~~ → crew membership FKs remain
15. ~~Communications email/templates~~ → SMS/Twilio when needed
16. ~~Super-admin tenant management~~ → `apps/admin` shipped; polish remains
17. Capacitor shell + native signature/camera (camera helper started)
18. SDLC Figma design system

---

## Key evidence paths

| Feature | Routes / files |
|---------|----------------|
| Portal v1 | `apps/web/app/portal/` — login, invoices, payments, documents, profile, **bookings, messages, support** |
| Portal API | `packages/plugins/portal/`, `apps/web/lib/portal-auth-context.tsx` |
| Admin SaaS | `apps/admin/app/admin/*`, `packages/core/platform/handlers.go` |
| Billing post-signup | `apps/web/app/onboarding/billing/`, `packages/core/billing/` |
| Billing dunning | `apps/web/app/billing/dunning/`, `apps/web/components/subscription-guard.tsx` |
| Platform migrations | `packages/core/platform/migrations.go` (202–205) |
| Maps deep links | `apps/web/lib/maps.ts`, `apps/web/components/maps/navigate-button.tsx` |
| Employee link | `packages/plugins/payroll/plugin.go` (migration 201), `apps/web/app/payroll/employees/page.tsx` |
| Jobs mine filter | `packages/plugins/scheduling/plugin.go` (`mine`, `assigned_to`), `apps/web/app/m/jobs/page.tsx` |
| Room pricing calc | `packages/plugins/estimating/pricing.go`, `plugin.go` calculate |
| Invoice preview | `apps/web/app/invoices/[id]/preview/page.tsx` |
| Dispatch assign | `apps/web/app/dispatch/page.tsx`, `apps/web/app/work-orders/[id]/page.tsx` |
| Property beds/baths | `packages/plugins/crm/plugin.go` (migration 105), properties UI |
| Dashboard KPIs | `apps/web/app/dashboard/page.tsx`, `listReportKpis()` |
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
