# Innexar Field Sprint — Status

> Sprint date: 2026-06-26 · Agent 10/10 (canvas + docs sync)  
> Related: [canvas-gaps.md](./canvas-gaps.md) · [ERP plan canvas](../canvases/erp-field-services-plan.canvas.tsx)

## Summary

**7 of 8 feature agents delivered.** ~1,590 lines changed across API, SDK, and web. One agent (portal pages) shipped backend + auth plumbing only; customer-facing routes remain stubs.

| Agent focus | Status | Delivered |
|-------------|--------|-----------|
| Employee ↔ user link | ✅ Complete | `employees.user_id` migration (201); `GET /employees/me`, `PATCH /employees/:id`; `/payroll/employees` UI to link workspace users; timesheets resolve employee from auth user |
| Jobs mine filter | ✅ Complete | `jobs.assigned_to` migration (123); `GET /jobs?mine=true` via employee/user lookup; `/m/jobs` uses `listJobs({ mine: true })`; desktop jobs list shows assigned tech |
| Google Maps (`maps.ts`) | ✅ Complete | `apps/web/lib/maps.ts` + `NavigateButton`; deep links on `/m/jobs/[id]`, `/work-orders/[id]`, `/schedule/map`, `/routes` |
| Property beds/baths/sqft | ✅ Complete | CRM migration (105); property CRUD fields; full create/edit UI on `/customers/[id]/properties`; SDK `Property` type updated |
| Estimate calculate tiers | ✅ Complete | `pricing.go`; `estimates.property_id`; `POST /estimates/:id/calculate` applies room-based `pricing_tiers` from linked property; integration tests |
| Invoice preview | ✅ Complete | `/invoices/[id]/preview` branded print layout; links + `?print=1` auto-print from invoice detail |
| Portal pages | ⚠️ Partial | New `packages/plugins/portal/` (magic-link auth, customer JWT, `GET /portal/me`, `/portal/invoices`); `PortalAuthProvider` in layout; **all `/portal/*` pages still `PortalStubPage`** |
| Dispatch assign | ✅ Complete | Technician assign form on dispatch board; assignment UI on `/work-orders/[id]`; status auto-updates to `assigned` |

## P0 after sprint

Only **customer portal web UI** remains P0 among the original wave-1/2 blockers:

1. Wire `/portal/login` → magic-link flow using `PortalAuthProvider`
2. Replace stub pages: payments (invoice list/pay), documents, profile
3. Server invoice PDF + email attachment (print preview done — now P1)

## Recommended next work (from canvas)

### Wave 3 — Client portal + finance depth

1. **Portal login page** — email + tenant slug form → `requestPortalMagicLink` / `verifyToken`
2. **Portal payments** — `portalMe` + `listPortalInvoices`; Stripe pay CTA
3. **Portal documents** — list estimates/invoices customer can access
4. **Server PDF** — render invoice/estimate HTML to PDF for email attachments

### Wave 4 — Platform

5. Stripe Connect + QuickBooks production keys and webhooks
6. Crew membership FKs (link crews to `employees`)
7. Communications module (email/SMS templates)
8. SDLC Figma design system (`sdlc3`)

### Quick wins

- Estimate builder: property picker to set `property_id` before calculate
- Job create/edit: assign technician (`assigned_to`) from desktop `/jobs`
- Portal hub: link preview cards to real `/portal/*` routes once wired

## Validation

Run after merge: `npm run validate && npm run typecheck`
