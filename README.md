# FieldForge

Premium multitenant ERP for field services (US): cleaning, construction, field ops.

## Status

| Area | Status |
|------|--------|
| Config central (`config/app.config.yaml`) | ✅ |
| Go API + plugins (CRM, Estimating, Scheduling, Invoicing) | ✅ |
| PostgreSQL RLS + migrations | ✅ |
| Marketing landing (`apps/marketing`) | ✅ |
| Web app (`apps/web`) — auth, dashboard, modules, PWA `/m/*` | ✅ |
| Mobile shell (`apps/web` + Capacitor) — iOS/Android native wrappers | ✅ scaffold |
| CI (validate, typecheck, go test, builds) | ✅ |

## Quick start

```bash
# Dependencies
docker compose up -d
cp .env.example .env
npm ci

# Database
export PATH="/usr/local/go/bin:$PATH"
go run ./apps/api/cmd/migrate

# API (port 8081 — set in .env)
go run ./apps/api/cmd/server

# Web app (port 3000) — separate terminal
npm run dev -w @fieldforge/web

# Marketing (port 3001)
npm run dev -w @fieldforge/marketing

# Platform admin (port 3002)
npm run dev -w @fieldforge/admin
```

Or: `make dev` then in separate terminals: `make migrate`, `make api`, `make web`, `make marketing`, `make admin`

## Dev URLs

| Service | URL |
|---------|-----|
| API | http://localhost:8081/api/v1 |
| Web (tenant app) | http://localhost:3000 |
| Marketing | http://localhost:3001 |
| Platform admin | http://localhost:3002 |

Copy `.env.example` to `.env` before starting apps (`PORT`, `NEXT_PUBLIC_API_URL`, etc.).

**Platform admin login:** seed a super_admin once after migrate — credentials live in `.env`, not in repo:

```bash
# Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD in .env, then:
make seed-platform-admin EMAIL=$PLATFORM_ADMIN_EMAIL PASSWORD=$PLATFORM_ADMIN_PASSWORD
```

Or pass `EMAIL` / `PASSWORD` on the command line. Sign in at http://localhost:3002.

## Mobile (Capacitor)

Field crews use the PWA at `/m/*` in the browser today. Native iOS/Android shells wrap the same UI via Capacitor when you are ready for the app stores.

```bash
# From repo root — sync web assets into native projects
npm run cap:sync

# First-time native scaffold (once per machine)
cd apps/web && npm run cap:add:android   # Android Studio
cd apps/web && npm run cap:add:ios       # Xcode (macOS only)

# Open native IDE
npm run cap:open:android
npm run cap:open:ios

# Production web build + sync
npm run mobile:build
```

`capacitor.config.ts` reads `appId`, `appName`, and iOS scheme from `@fieldforge/config` brand — change `config/app.config.yaml`, not hardcoded strings. Deep-link parsing lives in `@fieldforge/platform` (`parseDeepLink`, `useDeepLink`).

Set `CAPACITOR_SERVER_URL=https://app.fieldforge.com/m` to load a remote dev/staging server inside the WebView instead of static `out/`.

See [apps/web/README.md](apps/web/README.md) for prerequisites, platform adapter usage, and static-export notes.

## Monorepo layout

```
apps/
  api/          Go + Fiber HTTP API
  web/          Next.js SaaS app
  marketing/    Landing + pricing
packages/
  config/       YAML loader (@fieldforge/config)
  sdk/          API client (@fieldforge/sdk)
  ui/           Shared UI (@fieldforge/ui)
  platform/     Web vs native adapter + deep links (@fieldforge/platform)
  core/         Go kernel (auth, plugin, db, events)
  plugins/      crm, estimating, scheduling, invoicing
config/         Central dynamic config
docs/           Domain, ADR, security, ops
```

## API endpoints

- `GET /health`, `GET /health/ready`
- `GET /api/v1/config/public`
- `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`
- `GET /api/v1/crm/customers`, `GET /api/v1/estimating/estimates`, etc.

## Validate & test

Requires Go 1.22+ (`go.mod`). If `go version` shows 1.18, use `/usr/local/go/bin/go` or `export PATH="/usr/local/go/bin:$PATH"` (also set in the Makefile).

```bash
npm run validate
npm run typecheck
go test ./packages/core/... -race

# Production web build (writes apps/web/.next)
NEXT_PUBLIC_API_URL=http://localhost:8081/api/v1 npm run build -w @fieldforge/web
# or: npm run build:web
npm run start:web
```

## Git workflow

- `main` → production
- PR required; see `.github/DOD.md`
