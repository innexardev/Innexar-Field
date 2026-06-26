---
name: code-review
description: >-
  Professional code review for FieldForge PRs — quality, security, tests,
  domain alignment. Use when reviewing changes, before merge, or when user
  asks for review.
---

# Code Review

## Process

1. Read PR description and linked issue
2. Run `git diff` — understand scope
3. Check rules: `.cursor/rules/09-code-review.mdc`
4. Verify CI status

## Review dimensions

| Area | Check |
|------|-------|
| Correctness | Meets acceptance criteria |
| Domain | Glossary terms; aggregate boundaries |
| Security | tenant_id, RLS, no secrets, input validation |
| Tests | New behavior covered; tenant isolation |
| API | OpenAPI updated; idempotency where needed |
| Config | No hardcoded brand/pricing |
| Diff | Focused; no unrelated changes |

## Feedback format

```markdown
### Blocker
- [file:line] Description + suggested fix

### Should
- ...

### Nit
- ...
```

## Severity guide

- **Blocker:** security hole, data leak, missing tests on critical path, breaks CI
- **Should:** missing docs, suboptimal pattern, edge case untested
- **Nit:** naming, style (if not caught by linter)

## Approve when

- All blockers resolved
- Tests pass
- Security reviewed if auth/billing/PII touched
