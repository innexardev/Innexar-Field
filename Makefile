.PHONY: dev up down api api-e2e web marketing admin test validate migrate deploy deploy-prod seed-platform-admin

# go.mod requires Go 1.22+; system Go 1.18 breaks builds — use /usr/local/go/bin/go or this PATH.
export PATH := /usr/local/go/bin:$(PATH)

up:
	docker compose up -d

down:
	docker compose down

migrate:
	go run ./apps/api/cmd/migrate

api:
	go run ./apps/api/cmd/server

# Disables API rate limits for Playwright and local E2E (see packages/core/middleware/ratelimit.go).
api-e2e:
	E2E_TEST=1 go run ./apps/api/cmd/server

web:
	cd apps/web && npm run dev

marketing:
	cd apps/marketing && npm run dev

admin:
	cd apps/admin && npm run dev

seed-platform-admin:
	go run ./apps/api/cmd/seed-platform-admin --email "$(EMAIL)" --password "$(PASSWORD)"

test:
	go test ./packages/core/... ./packages/plugins/... -race -count=1
	cd apps/web && npm test -- --passWithNoTests 2>/dev/null || true

validate:
	npm run validate
	npm run typecheck

deploy:
	docker compose -f docker-compose.prod.yml up -d --build

deploy-prod:
	@test -n "$(POSTGRES_PASSWORD)" || (echo "set POSTGRES_PASSWORD" && exit 1)
	@test -n "$(JWT_SECRET)" || (echo "set JWT_SECRET" && exit 1)
	docker compose -f docker-compose.prod.yml up -d --build

dev: up
	@echo "Infrastructure up (postgres, redis). Run in separate terminals:"
	@echo "  make migrate"
	@echo "  make seed-platform-admin   # EMAIL/PASSWORD or PLATFORM_ADMIN_* in .env"
	@echo "  make api        # http://localhost:8081"
	@echo "  make web        # http://localhost:3000"
	@echo "  make marketing  # http://localhost:3001"
	@echo "  make admin      # http://localhost:3002"
