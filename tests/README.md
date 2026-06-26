# FieldForge tests

## Platform admin smoke (Phase 1)

Verifies platform operator login, plan create/list/delete, and tenant list against a running API.

**Prerequisites**

- API on `http://127.0.0.1:8081` (or set `PLAYWRIGHT_API_URL`)
- Platform super admin seeded, e.g.:

  ```bash
  make seed-platform-admin EMAIL=admin@fieldforge.local PASSWORD='Admin123!'
  ```

**Credentials** (override with env):

| Variable | Default |
|----------|---------|
| `PLATFORM_ADMIN_EMAIL` | `admin@fieldforge.local` |
| `PLATFORM_ADMIN_PASSWORD` | `Admin123!` |

### Playwright (API-only)

Does not start the tenant web app; point at an already-running API:

```bash
PLAYWRIGHT_EXTERNAL=1 npm run test:smoke:platform
```

Or with explicit API URL:

```bash
PLAYWRIGHT_EXTERNAL=1 PLAYWRIGHT_API_URL=http://127.0.0.1:8081 \
  npx playwright test tests/e2e/platform-admin-smoke.spec.ts
```

### curl

```bash
bash tests/smoke/platform-admin.sh
```

Requires `curl` and `jq`.

## Tenant E2E (Playwright)

Full browser flows under `tests/e2e/`. Starts API + web unless `PLAYWRIGHT_EXTERNAL=1`:

```bash
npm run test:e2e
```

### CI and local E2E environment

Playwright starts the API via `make api-e2e`, which sets `E2E_TEST=1`. In GitHub Actions (`test-e2e` job), `CI=1` and `E2E_TEST=1` are also set at job scope so the API process disables rate limits (`packages/core/middleware/ratelimit.go`).

When running servers manually for E2E:

```bash
E2E_TEST=1 make api          # or: make api-e2e
# separate terminal:
NEXT_PUBLIC_API_URL=http://127.0.0.1:8081/api/v1 npm run start:e2e:web
PLAYWRIGHT_EXTERNAL=1 PLAYWRIGHT_API_URL=http://127.0.0.1:8081 npx playwright test
```

### API host (`127.0.0.1` vs `localhost`)

`playwright.config.ts` and `tests/e2e/helpers.ts` rewrite `localhost` to `127.0.0.1` for API URLs so Node does not resolve `localhost` to IPv6 (`::1`) when the API listens on IPv4 only.

### Auth session seeding

Helpers seed `ff_token` and onboarding state in `localStorage`, then navigate to `/dashboard` and **wait for `GET /auth/me` (200)** before asserting the page. That avoids a race where the auth provider has not hydrated `user` from the token yet.
