# Canvas vs Codebase Gap Analysis

> Product audit comparing the architectural canvas (`docs/canvases/erp-field-services-plan.canvas.tsx`) to the FieldForge codebase.  
> Related: [ERP Backlog v2](./erp-backlog-v2.md) · Canvas plan · Last reviewed: 2026-06-27 (wave 1–3 sync).

## Purpose

The ERP plan canvas tracks MVP phases (F0–F8), engineering foundations, landing/GTM, and web screen coverage. This document records where canvas status overstated delivery and what remains to reach the product vision (employee portal, client portal, room pricing, branded PDFs, production integrations).

**Maturity estimate (2026-06-27):** ~78–82% toward canvas MVP vision.

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

> **Gap review (2026-06-27, wave 1–3):** Server PDF, portal v1, communications v1, notifications, photo upload, crew↔employee FKs, property picker, and mobile signature are **done**. See [sprint-status.md](./sprint-status.md).

| Rank | Gap | Canvas says | Reality | Severity |
|------|-----|-------------|---------|----------|
| 1 | **Stripe Connect / QuickBooks production** | Integrations in catalog | Mock by default (`MockStripe`, `MockQuickBooks`); settings page shows “dev stub”; SaaS billing webhooks exist but need live keys in staging/prod | **P1** |
| 2 | **PDF email attachment flow** | F4 Invoicing | Server PDF + print preview shipped; no automated email-with-PDF attachment on send | **P1** |
| 3 | **Communications SMS / Twilio** | Catalog = `expand` | Email templates + transactional email v1 done; SMS, review requests, Twilio not wired | **P1** |
| 4 | **SDLC Figma / design system** | `sdlc3` = pending | Still pending — accurate | **P1** |
| 5 | **Expenses OCR / receipt scan** | F4 partial | Basic expense CRUD; no OCR or mileage automation | **P2** |
| 6 | **Capacitor native depth** | Mobile tab | PWA + Capacitor scaffold; `/m/signature` shipped; `/m/vehicle` stub; push notifications pending | **P2** |
| 7 | **Live map embed / fleet GPS** | F3 Scheduling | Google Maps deep links done; no live fleet map or GPS tracking | **P2** |
| 8 | **Marketing contact + analytics** | `land` = pending | Contact API stub (no email send); no GTM/analytics wiring | **P2** |
| 9 | **E-signature on proposals** | Catalog proposals = `new` | Mobile job signature done; public proposal e-sign not built | **P2** |
| 10 | **Marketplace onboarding** | F0 partial | `/marketplace` = “Coming soon” | **P2** |

Honorable mentions: purchase orders, documents/RFI full mgmt, admin SaaS live-metrics polish, notifications push/SMS prefs.

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

### Wave 3 — Finance, crews & field mobile ✅ (2026-06-27)

| Area | Delivered |
|------|-----------|
| **Crew ↔ employee FKs** | `crew_members` migration (124); `GET/POST/DELETE /scheduling/crews/:id/members`; `/crews` UI with add/remove employees |
| **Mobile signature** | `/m/signature` with `SignaturePad`, camera capture, offline queue; `customer_signatures` API in scheduling plugin |

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
| **p2** F2 Estimates + Price Book | pending | **partial** | Estimates/takeoff/price-book CRUD; **room-tier calculate** from property; price-book tier editor; **property picker** in wizard |
| **p3** F3 Scheduling + Dispatch | pending | **partial** | Schedule, crews (**employee FKs** via `crew_members`), routes; **dispatch assign UI**; **Google Maps deep links** |
| **p4** F4 Expenses + Invoicing | pending | **partial** | CRUD + payments; **invoice print preview + server PDF**; expenses basic (no OCR) |
| **p5** F5 Cleaning | pending | **partial** | QC/supplies API; **real photo upload** on cleaning jobs |
| **p6** F6 Construction | pending | **partial** | CO workflow API+UI solid; **real daily-log photo upload**; permit alerts in plugin |
| **p7** F7 PWA campo | pending | **partial** | Offline queue, SW v3; **`/m/jobs?mine` filter**; maps navigate; **`/m/signature` shipped**; vehicle/profile stubs |
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
| Estimates | list, builder, calculate (room tiers), preview/print, property picker | send flow | — | email PDF attachment |
| Finance | invoices list, expenses, job-costing, invoice print preview, **server PDF** | invoice detail | accounting lists | expenses OCR, email PDF |
| Payroll | employees, runs, tax, timesheets, employee↔user link | — | — | — |
| Schedule/Dispatch | schedule, recurring, routes, **crews + employee members**, dispatch assign, maps links | schedule map (grid + navigate) | — | live map embed |
| Cleaning | jobs, phases, **QC photo upload** | supplies | — | — |
| Construction | projects, CO, permits, RFIs, subs, **daily-log photos** | — | — | — |
| PWA `/m/*` | jobs list/detail (mine filter), time, expenses, sync, maps navigate, **signature pad** | offline queue | vehicle, profile | — |
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
| notifications | **`packages/core/notifications/`** — tenant-scoped list + mark read (**done** v1) |
| file-storage | `storage` package + **multipart upload** — **partial** |
| integrations-hub | `packages/integrations/` — **stub/mock** |
| client-portal | **done** — portal v1 including bookings/messages/support |
| communications | **partial** — email/templates v1 **done**; SMS/Twilio pending |
| fleet | `/m/vehicle` stub |
| documents (RFIs) | RFIs page exists; full doc mgmt missing |
| admin-saas | **`apps/admin`** — platform console shipped (**done** v1) |
| mobile-core / Capacitor | PWA + Capacitor scaffold; **signature + camera** shipped; push pending |

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
| **Employee portal** | **partial** | `/m/jobs?mine`, maps navigate, offline sync, **`/m/signature`**; vehicle stub remains |
| **Contract templates** | **partial** | 3 US templates seeded (`packages/plugins/crm/templates.go`); UI at `/contracts` with template picker |
| **PDF invoices** | **partial** | Print preview + **server PDF** render; email attachment flow TBD |
| **Room pricing** | **partial** | Property beds/baths + tiers + calculate + **property picker** in estimate builder |
| **Integrations** | **partial** | Stripe production key resolver; QB still mock without OAuth; SaaS billing webhooks implemented — roadmap: [integrations-roadmap.md](./integrations-roadmap.md) |
| **Portal cliente** | **done** | Full portal v1 including bookings, messages, support; Stripe pay with production key path; public quote at `/p/[token]` |
| **Crews ↔ employees** | **done** | `crew_members` table; CRUD API; `/crews` member picker UI |
| **Photo upload** | **done** | Real multipart upload — cleaning QC + construction daily logs |
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

### Wave 3 — Finance, crews & field mobile ✅ (2026-06-27)

9. ~~Branded invoice print preview~~ → ~~server PDF~~ shipped; email attachment remains
10. ~~Customer portal v1~~ → **complete** (bookings, messages, support, Stripe production path)
11. ~~Billing post-signup + dunning~~ → ~~Stripe SaaS production key path~~; Connect tenant UX remains
12. ~~Crew ↔ employee FKs~~ → `crew_members` + `/crews` UI
13. ~~Mobile signature~~ → `/m/signature` + scheduling signatures API

### Wave 4 — Integrations & platform depth (in progress)

> Priorização Tier 1–3: [integrations-roadmap.md](./integrations-roadmap.md) (Twilio, Google Calendar, Zapier, Mailchimp → P1).

13. Stripe Connect production path (real keys, webhooks)
14. QuickBooks OAuth production + sync
15. Communications SMS/Twilio when needed (P1)
16. ~~Super-admin tenant management~~ → `apps/admin` shipped; polish remains
17. Capacitor push + native vehicle/camera polish
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
| Crew members | `packages/plugins/scheduling/crew_members.go`, `apps/web/app/crews/page.tsx` |
| Mobile signature | `apps/web/app/m/signature/page.tsx`, `packages/plugins/scheduling/` signatures routes |
| Server PDF | `packages/plugins/invoicing/pdf.go`, `packages/plugins/estimating/pdf.go` |
| Photo upload | `apps/web/components/cleaning/photo-upload.tsx`, `packages/core/storage/service.go` |
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
