---
name: write-tests
description: >-
  Write unit, integration, and E2E tests for FieldForge. Use when implementing
  features, fixing bugs, or when tests are missing.
---

# Write Tests

## Pyramid

```
        E2E (few, critical paths)
       /                        \
  Integration (API, RLS, DB)
 /                              \
Unit (domain, validators, utils)
```

## Go

```go
func TestEstimate_Accept_CreatesJob(t *testing.T) {
    // Arrange: in-memory or test DB with tenant context
    // Act
    // Assert: job created, event published
}

func TestEstimate_TenantIsolation(t *testing.T) {
    // Tenant A creates estimate
    // Tenant B cannot GET it → 404
}
```

- Table-driven tests for validators
- `testcontainers` for PostgreSQL integration
- Mock external APIs (Stripe, Avalara)

## TypeScript

```typescript
describe('useEstimate', () => {
  it('returns loading then data', async () => { ... });
});
```

- Vitest/Jest for units
- React Testing Library — test behavior not implementation
- Playwright for E2E: login → create estimate → accept

## Mandatory cases

| Feature | Tests |
|---------|-------|
| Any CRUD | happy path + 404 + validation errors |
| Multitenant | cross-tenant access denied |
| Billing | idempotency replay |
| Auth | expired token, wrong tenant |

## Commands

```bash
go test ./... -race -count=1
npm test
npx playwright test
```

## Naming

- Go: `Test{Unit}_{Scenario}_{Expected}`
- TS: `it('should {behavior} when {condition}')`
