# Innexar Field Sprint — Status

> Sprint date: 2026-06-26 · Gap review: 2026-06-26 (wave 1+2 complete)  
> Related: [canvas-gaps.md](./canvas-gaps.md) · [ERP plan canvas](../canvases/erp-field-services-plan.canvas.tsx)

## Summary

**Maturity ~68–72%** toward canvas MVP. Innexar Field **waves 1+2** closed daily ops, sales/CRM polish, and **portal v1** end-to-end. Shipped: **communications v1**, **notifications module**, **Stripe production path** (env + platform settings), **real photo upload** (cleaning QC + construction daily logs), **server PDF** (invoice/estimate), **property picker** in estimate builder, and **`/settings/templates`**.

| Agent focus | Status | Delivered |
|-------------|--------|-----------|
| Employee ↔ user link | ✅ Complete | `employees.user_id` migration (201); `GET /employees/me`, `PATCH /employees/:id`; `/payroll/employees` UI to link workspace users; timesheets resolve employee from auth user |
| Jobs mine filter | ✅ Complete | `jobs.assigned_to` migration (123); `GET /jobs?mine=true` via employee/user lookup; `/m/jobs` uses `listJobs({ mine: true })`; desktop jobs list shows assigned tech |
| Google Maps (`maps.ts`) | ✅ Complete | `apps/web/lib/maps.ts` + `NavigateButton`; deep links on `/m/jobs/[id]`, `/work-orders/[id]`, `/schedule/map`, `/routes` |
| Property beds/baths/sqft | ✅ Complete | CRM migration (105); property CRUD fields; full create/edit UI on `/customers/[id]/properties`; SDK `Property` type updated |
| Estimate calculate tiers | ✅ Complete | `pricing.go`; `estimates.property_id`; `POST /estimates/:id/calculate` applies room-based `pricing_tiers` from linked property; integration tests |
| Property picker (estimate builder) | ✅ Complete | `EstimatePropertyPicker` in estimate wizard; sets `property_id` before calculate |
| Invoice preview + server PDF | ✅ Complete | `/invoices/[id]/preview` branded print layout; server PDF render in invoicing/estimating plugins; download helper |
| Dispatch assign | ✅ Complete | Technician assign form on dispatch board; assignment UI on `/work-orders/[id]`; status auto-updates to `assigned` |
| Portal v1 | ✅ Complete | Login (magic-link), invoices, **Stripe pay**, documents, profile, **bookings**, **messages**, **support** — API + UI wired (`packages/plugins/portal/`, SDK) |
| Communications v1 | ✅ Complete | `packages/plugins/communications/` — templates + transactional email; `/settings/templates` |
| Notifications | ✅ Complete | `packages/core/notifications/` — list/mark-read replaces demo endpoint |
| Stripe production | ✅ Complete | `stripe_config.go` — env + platform_settings resolver; mock only when debug + no secret |
| Photo upload | ✅ Complete | `photo-upload.tsx`, `daily-log-photo-upload.tsx`; storage multipart; cleaning/construction plugins |
| Admin SaaS | ✅ Complete | `apps/admin` — platform console: dashboard+MRR, tenants, users, plans, billing-settings, integrations, modules, audit; API `/platform/*` |
| Billing post-signup | ✅ Complete | Signup → `/onboarding/billing` → `createCheckout`; `subscription-guard`; `/billing/dunning`; webhooks in `packages/core/billing/` |
| Dashboard KPIs | ✅ Complete | `/dashboard` loads KPIs via `listReportKpis()`; role dashboards (owner/dispatcher/accountant) |
| Platform migrations | ✅ Complete | Migrations 202–205 in `packages/core/platform/migrations.go` (billing settings, user admin, settings, seed plans) |

## Wave 1+2 delivery log (2026-06-26)

### Wave 1 — Daily ops & revenue ✅

- Work order assignment UI (dispatch board + `/work-orders/[id]`)
- `jobs.assigned_to` / `/m/jobs?mine=true`
- Google Maps deep links on job cards, routes, schedule map
- Dispatch board: assign technician from board

### Wave 2 — Sales, CRM, portal & platform ✅

- Property beds/baths/sqft + price-book tier calculate
- Property picker in estimate builder
- Portal **bookings** (customer jobs list), **messages** + **support** (portal_support_requests migration 134)
- Communications plugin + email templates UI
- Notifications module (tenant-scoped list/update)
- Stripe production key resolution (SaaS + Connect path)
- Real photo upload (cleaning QC, construction daily logs)
- Server PDF for invoices/estimates

## P0 after wave 1+2

**No remaining P0 ops blockers.** Top priorities shifted to **integrations production** and **field mobile depth**:

1. QuickBooks OAuth production + basic AR sync
2. Crew ↔ employee FKs (scheduling/payroll alignment)
3. Capacitor camera/signature/push (native shell polish)
4. SDLC Figma design system (`sdlc3`)
5. Marketing contact API + analytics GTM

## Recommended next work

### Sprint A — Integrations production

1. **QuickBooks OAuth** — production sync basic AR
2. **Stripe Connect** — tenant onboarding UX + webhook hardening in staging
3. **E2E tests** — portal pay + billing + support request flows

### Sprint B — Field & crews

4. **Crew ↔ employee FKs** — link crews to `employees`, not just `member_count`
5. **Capacitor** — camera + native signature; push notifications
6. **Fleet / live map** — beyond deep links

### Sprint C — Platform polish

7. **Admin polish** — live metrics, audit depth
8. **Communications v2** — SMS/Twilio when needed
9. **Expenses OCR** — receipt capture

### Backlog

- SDLC Figma design system (`sdlc3`)
- Marketplace onboarding (`/marketplace`)
- Marketing analytics GTM
- E-signature on proposals

## Validation

Run after merge: `npm run validate && npm run typecheck`
