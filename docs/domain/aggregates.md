# Aggregates — FieldForge

> Raízes de agregado e invariantes (DDD).

## Princípios

- Uma transação = um aggregate.
- Referências cross-aggregate por ID apenas.
- Invariantes validadas no aggregate root, não no controller.

## Catálogo

### Tenant (root: `Tenant`)

| Campo | Regra |
|-------|-------|
| `slug` | Único global, kebab-case |
| `plan_id` | Deve existir em `pricing.plans` |
| `industry_packs` | ≥1 pack ativo |

**Invariantes:** não desativar último owner; downgrade de plano valida limits.

### Customer (root: `Customer`)

Contém `Property[]` como entidades filhas.

**Invariantes:** pelo menos um contact method; properties com endereço US válido.

### Estimate (root: `Estimate`)

Contém `LineItem[]`. Estados: `draft` → `sent` → `accepted` | `rejected` | `expired`.

**Invariantes:** total > 0 para enviar; não editar após `accepted`.

### Job (root: `Job`)

Referencia `customer_id`, `property_id`, opcional `estimate_id`.

Estados: `scheduled` → `in_progress` → `completed` | `cancelled`.

**Invariantes:** só `completed` com checklist obrigatório (se plugin cleaning); clock-out após clock-in.

### Invoice (root: `Invoice`)

Estados: `draft` → `sent` → `paid` | `overdue` | `void`.

**Invariantes:** idempotency key em pagamentos; total = sum(line items) + tax; tenant_id em todas linhas.

### Expense (root: `Expense`)

Estados: `draft` → `submitted` → `approved` | `rejected` → `reimbursed`.

**Invariantes:** alocação a job/project somente após `approved`.

### Project (root: `Project`) — Construction

Contém `Phase[]`, `ChangeOrder[]`.

**Invariantes:** budget atualizado atomicamente com CO aprovado.

## Optimistic locking

Campos `version` (integer) em: Job, Invoice, Estimate, Project.

Updates com `WHERE version = ?` — conflito retorna `409 Conflict`.
