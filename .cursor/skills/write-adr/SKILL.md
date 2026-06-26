---
name: write-adr
description: >-
  Write Architecture Decision Records for FieldForge. Use when making
  architectural choices, new integrations, or context boundary changes.
---

# Write ADR

## When to write

- New bounded context or plugin boundary
- External service integration (Stripe, Avalara, maps)
- Data storage or messaging pattern change
- Security or compliance decision

## Template

Create `docs/adr/NNNN-short-title.md`:

```markdown
# ADR-NNNN: Title

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XXXX

## Context
What problem? What constraints?

## Decision
What we chose and why.

## Consequences
### Positive
- ...

### Negative
- ...

## Alternatives considered
1. Option A — rejected because ...
2. Option B — ...
```

## Numbering

Check existing: `ls docs/adr/`. Next number = max + 1.

## Link from code

Reference ADR in PR description and relevant package README.

Agent: `@.cursor/agents/architect.md`
