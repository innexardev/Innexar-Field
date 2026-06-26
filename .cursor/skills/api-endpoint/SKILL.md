---
name: api-endpoint
description: >-
  Design and implement REST API endpoints for FieldForge — routing, validation,
  idempotency, OpenAPI. Use when adding apps/api routes or docs/api changes.
---

# API Endpoint

## Design

1. REST noun, plural: `/api/v1/estimates`
2. Actions as sub-resources: `POST /estimates/{id}/accept`
3. HTTP verbs: GET list/detail, POST create, PATCH update, DELETE soft-delete

## Implementation (Go)

```go
// handler/estimate.go — thin
func (h *Handler) Accept(c *fiber.Ctx) error {
    tenantID := middleware.TenantID(c)
    id := c.Params("id")
    result, err := h.svc.Accept(c.Context(), tenantID, id)
    if errors.Is(err, domain.ErrNotFound) {
        return fiber.NewError(404, "estimate not found")
    }
    return c.JSON(result)
}
```

## Validation

- Parse body into struct with validation tags
- Return 400 with `{ "error": { "code": "VALIDATION", "details": [...] } }`

## Idempotency

Required on: payments, invoices, onboarding-complete, webhooks.

```
Idempotency-Key: {uuid}
```

Store key + response; replay returns cached response.

## OpenAPI

Update `docs/api/openapi.yaml` with:
- path, method, params, request/response schemas
- security: bearerAuth

## Tests

- 200/201 happy path
- 400 validation
- 401/403 auth
- 404 not found
- Tenant isolation

Rule: `.cursor/rules/07-api-design.mdc`
