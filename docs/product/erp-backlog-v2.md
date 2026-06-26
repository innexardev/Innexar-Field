# ERP Backlog v2 — Field Services Vision

> From product vision audit (2026-06-26). See canvas `docs/canvases/erp-field-services-plan.canvas.tsx`.

## Priority legend

- **P0** — Blocks daily ops or revenue
- **P1** — Complete ERP, not blocking first crew
- **P2** — Vertical depth, integrations, polish

## Top 10 P0

| ID | Item | Routes |
|----|------|--------|
| OPS-001 | Work order detail + employee assignment | `/work-orders`, `/dispatch` |
| OPS-002 | Employee PWA: my jobs + Google Maps | `/m/jobs` |
| SAL-001 | Price book beds/baths pricing | `/price-book`, `/estimates/:id/calculate` |
| CRM-001 | Property beds/baths/sqft | `/customers/:id/properties` |
| FIN-001 | Branded invoice PDF | `/invoices/:id` |
| SAL-002 | Estimate PDF / printable export | `/estimates/:id`, `/p/:token` |
| OPS-003 | Schedule map/routes → Google Maps | `/schedule/map`, `/routes` |
| OPS-004 | Crews ↔ payroll employees (W2/1099) | `/crews`, `/payroll` |
| CRM-002 | US contract templates | `/contracts` |
| CRM-003 | Customers UX hints + guided flows | `/customers` |

## Next 3 sprints

1. **Sprint 1** — Work orders + dispatch assignment (OPS-001)
2. **Sprint 2** — Employee portal v1 + Google Maps links (OPS-002, OPS-003)
3. **Sprint 3** — Room pricing + branded PDFs (SAL-001, SAL-002, FIN-001)

## Gap summary

| Area | Exists | Stub | Missing |
|------|--------|------|---------|
| Sales CRM | customers, leads, estimates, takeoff | contracts, price-book room pricing | templates, beds/baths |
| Operations | jobs, schedule, recurring | work-orders, dispatch assign UI, map | employee portal depth |
| Finance | payments list | invoices PDF, expenses rich | Stripe/QB production |
| Workforce | timesheets, m/time GPS | payroll runs | employee↔user link |
| Integrations | settings UI | QuickBooks, Stripe mock | production OAuth |

Full gap matrix and acceptance criteria: see agent transcript or expand sections below per module in future PRs.
