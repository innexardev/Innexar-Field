# File storage (tenant logos)

Tenant logos upload via `POST /api/v1/tenant/logo/upload` (authenticated).

| Mode | When | Result URL |
|------|------|------------|
| **R2** | All `R2_*` env vars set | `R2_PUBLIC_URL/tenants/{tenant_id}/logo/{uuid}.{ext}` |
| **Local** | R2 unset (default dev) | `UPLOAD_LOCAL_PUBLIC_URL/...` served from `./uploads` |
| **Mock** | `R2_MOCK=1` | Base64 data URL (tests / offline dev) |

See root `.env.example` for variables.
