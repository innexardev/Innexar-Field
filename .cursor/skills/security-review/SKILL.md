---
name: security-review
description: >-
  Security audit for auth, billing, PII, API endpoints, and multitenant
  isolation. Use before merging sensitive features or when user asks for
  security review.
---

# Security Review

## Required reading

- `projects/fieldforge/docs/security/threat-model.md`
- `docs/security/api-security.md`
- `docs/security/secrets.md`

## Checklist

### Multitenant

- [ ] Every query filters by `tenant_id` from JWT (not header/body)
- [ ] RLS policies on all new tables
- [ ] Integration test: tenant A cannot access tenant B

### Authentication

- [ ] JWT validation on protected routes
- [ ] No `bypass_auth` in staging/prod configs
- [ ] Session/token expiry enforced

### Input / Output

- [ ] Request body size limits
- [ ] Validation on all user input
- [ ] No SQL injection (parameterized queries only)
- [ ] XSS: escape user content in HTML

### Secrets

- [ ] No secrets in code, logs, or commits
- [ ] Env vars for API keys
- [ ] `.env` in `.gitignore`

### Billing / Payments

- [ ] Idempotency-Key on charge endpoints
- [ ] Webhook signature verification (Stripe)
- [ ] No card data stored (PCI)

### OWASP Top 10

Scan for: injection, broken auth, sensitive data exposure, XXE, broken access control, misconfig, XSS, insecure deserialization, vulnerable components, insufficient logging.

## Output

```markdown
## Security Review — {feature}

**Risk:** Low | Medium | High | Critical

### Findings
1. [SEV] Description — remediation

### Approved / Blocked
```

Agent: `@.cursor/agents/security-auditor.md`
