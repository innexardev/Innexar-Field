# Ubiquitous Language — FieldForge

> Glossário oficial (DDD). Use estes termos em código, UI, API e documentação.

## Plataforma

| Termo | Definição | Não confundir com |
|-------|-----------|-------------------|
| **Tenant** | Empresa assinante do SaaS (um cliente B2B) | Customer (cliente final do tenant) |
| **Industry Pack** | Bundle de módulos ativados por ramo no onboarding | Pricing plan |
| **Plugin** | Módulo opcional registrado no kernel | Feature flag isolada |
| **Workspace** | Sinônimo de tenant no UI | — |

## Comercial

| Termo | Definição |
|-------|-----------|
| **Customer** | Cliente final do tenant (quem recebe o serviço) |
| **Property** | Endereço/local onde o serviço é executado |
| **Lead** | Prospect ainda não convertido em customer |
| **Contract** | Acordo de serviço recorrente ou projeto |

## Estimativa

| Termo | Definição |
|-------|-----------|
| **Estimate** | Orçamento em elaboração (draft) |
| **Quote** | Estimate enviado ao customer para aprovação |
| **Proposal** | Quote com documento formal + e-signature |
| **Price Book** | Catálogo de rates labor/material/serviço |
| **Line Item** | Linha de custo em estimate/invoice |
| **Markup** | Percentual sobre custo |
| **Margin** | Lucro percentual sobre preço final |

## Operações

| Termo | Definição | Contexto |
|-------|-----------|----------|
| **Job** | Unidade de trabalho agendada e executável | Cleaning, general |
| **Work Order** | Ordem de serviço com prioridade/SLA | Field services, HVAC |
| **Project** | Obra com fases, budget e change orders | Construction |
| **Dispatch** | Atribuição de técnico/crew a job em tempo real | — |
| **Crew** | Equipe de campo (1+ technicians) | — |
| **Phase** | Etapa de limpeza pós-obra (rough/final/premium) | Cleaning vertical |
| **Change Order (CO)** | Alteração de escopo/custo aprovada | Construction |
| **Milestone** | Marco de faturamento por % conclusão | Construction |

## Financeiro

| Termo | Definição |
|-------|-----------|
| **Invoice** | Fatura emitida ao customer |
| **Expense** | Despesa do tenant alocável a job/project |
| **Job Costing** | Budget vs actual por job |
| **Cost Code** | Categoria contábil de custo |
| **Retainage** | Retenção percentual até conclusão (construction US) |
| **Progress Billing** | Fatura por % de conclusão |
| **WIP** | Work in Progress — receita/custo não faturado |

## Payroll (US)

| Termo | Definição |
|-------|-----------|
| **Employee** | Pessoa na folha do tenant (W-2 ou 1099 contractor) |
| **Timesheet** | Horas registradas por employee e job, sujeitas a aprovação |
| **Payroll Run** | Processamento de um período de pagamento (gross, withholdings, net) |
| **Tax Profile** | Configuração de retenção federal por employee (W-4: filing status + allowances) |
| **Filing Status** | Status de declaração IRS no W-4 (single, married filing jointly, etc.) |
| **Allowances** | Número de allowances no W-4 usado para calcular retenção federal (stub) |

## Papéis (RBAC)

### Tenant (workspace)

| Role | Escopo |
|------|--------|
| **owner** | Tenant completo + billing |
| **admin** | Configuração e usuários |
| **dispatcher** | Schedule e dispatch |
| **field-tech** | Jobs atribuídos, campo |
| **accountant** | Financeiro e relatórios |
| **client** | Portal self-service |
| **sub-contractor** | Work orders atribuídos |

### Platform (uber-admin)

| Role | Escopo |
|------|--------|
| **super_admin** | Operações cross-tenant: config global, registry, stats, audit (não confundir com tenant `admin`) |

Conta em `platform_admins`, JWT sem `tenant_id`. Ver [ADR-0005](../adr/0005-platform-admin-boundary.md).

## Eventos de domínio (nomes canônicos)

Formato: `{context}.{aggregate}.{action}`

- `commercial.lead.converted`
- `estimating.quote.accepted`
- `estimating.quote.rejected`
- `operations.job.scheduled`
- `operations.job.completed`
- `financial.invoice.paid`
- `financial.expense.approved`
- `construction.change_order.approved`

Ver [events.md](events.md) para payload e versionamento.
