# Innexar Field — Platform Admin (`apps/admin`)

Next.js console for platform operators (super-admin). Runs on port **3002** in development.

## Routes

All authenticated screens live under `/admin/*`. Login is public at `/login`.

| Path | Purpose |
|------|---------|
| `/login` | Platform operator sign-in (`POST /platform/auth/login`) |
| `/admin/dashboard` | SaaS metrics (MRR, signups, subscription health) |
| `/admin/tenants` | Tenant registry — list, create, suspend |
| `/admin/tenants/[id]` | Tenant detail — plan, industry pack, subscription |
| `/admin/users` | Cross-tenant workspace users (CRUD) |
| `/admin/plans` | Platform plan catalog (Stripe price IDs) |
| `/admin/billing` | Trial days, default plan, checkout redirect URLs |
| `/admin/integrations` | Encrypted platform credentials (Stripe, QB, SMTP, storage) |
| `/admin/modules` | Plugin catalog — global enable/disable + pack defaults |
| `/admin/announcements` | Tenant-facing banners (MVP) |
| `/admin/audit` | Platform audit log (read-only) |

Legacy paths (`/dashboard`, `/tenants`, …) redirect to `/admin/*` via `next.config.ts`.

## Auth

- JWT stored in `localStorage` (`ff_platform_token`).
- `app/admin/layout.tsx` wraps protected routes with `AdminLayout` (sidebar + session check).
- Unauthenticated users are redirected to `/login`.

## Development

```bash
cd projects/fieldforge
npm run dev --workspace=@fieldforge/admin   # http://localhost:3002
```

API base URL: `NEXT_PUBLIC_API_URL` (see `lib/api-url.ts`).

## Validation

```bash
npm run validate
npm run typecheck   # includes apps/admin/tsconfig.typecheck.json
```
