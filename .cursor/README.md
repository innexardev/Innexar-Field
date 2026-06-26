# Cursor AI — Rules, Skills & Agents

Estrutura profissional alinhada a **Cursor Rules (2026)**, **Anthropic CLAUDE.md**, e **AGENTS.md** portável.

## Layout

```
.cursor/
├── rules/          # 11 arquivos .mdc
├── skills/         # 6 workflows SKILL.md
└── agents/         # 9 personas por função
AGENTS.md           # Roster + fluxo de módulo (portável)
CLAUDE.md           # Entrada para Claude Code
```

## Rules (`.mdc`)

| Arquivo | Modo | Conteúdo |
|---------|------|----------|
| `00-core-fieldforge` | always | Stack, paths, non-negotiables |
| `01-clean-code` | always | SOLID, naming, funções pequenas |
| `02-testing` | `**/*.{go,ts,tsx}` | Pirâmide, tenant isolation |
| `03-security-multitenant` | glob | RLS, JWT, OWASP |
| `04-go-backend` | `**/*.go` | Plugins, handlers, repos |
| `05-typescript-frontend` | `**/*.{ts,tsx}` | Next.js, config, mobile |
| `06-plugin-module` | `packages/plugins/**` | Checklist novo módulo |
| `07-api-design` | `apps/api/**` | REST, idempotency, OpenAPI |
| `08-ddd-domain` | `docs/domain/**` | Glossary, aggregates, events |
| `09-code-review` | manual | Gate antes do merge |
| `10-git-workflow` | always | Branches, commits, PRs |

## Skills

| Skill | Quando usar |
|-------|-------------|
| `create-plugin-module` | Novo plugin em `packages/plugins/` |
| `code-review` | Revisar PR antes do merge |
| `security-review` | Auth, billing, PII |
| `write-tests` | Unit, integration, E2E |
| `write-adr` | Decisão arquitetural |
| `api-endpoint` | Nova rota REST + OpenAPI |

## Agents

Referencie com `@.cursor/agents/<nome>.md`:

| Agent | Função |
|-------|--------|
| `architect` | ADRs, contextos, integrações |
| `backend-go` | API Go, plugins, workers |
| `frontend-nextjs` | Web, marketing, UI |
| `mobile-engineer` | PWA, Capacitor |
| `qa-engineer` | Testes, cobertura, E2E |
| `security-auditor` | Threat model, OWASP |
| `devops-sre` | CI/CD, SLO, runbooks |
| `tech-lead-reviewer` | Gate final de merge |
| `product-analyst` | Requisitos, glossary |

## Fluxo — novo módulo

```
product-analyst → architect → backend/frontend → qa-engineer
                                              → security-auditor (se sensível)
                                              → tech-lead-reviewer → merge
```

## Novo projeto

```bash
cp -r templates/cursor-ai/.cursor projects/meu-projeto/
cp templates/cursor-ai/AGENTS.md templates/cursor-ai/CLAUDE.md projects/meu-projeto/
# Edite AGENTS.md com stack e paths do projeto
```

## Referências (mercado)

- [Cursor Docs — Rules](https://docs.cursor.com/context/rules)
- Anthropic — `CLAUDE.md` + modular context
- GitHub `AGENTS.md` — padrão emergente multi-ferramenta
- Conventional Commits + PR templates
- OWASP ASVS + multitenant RLS patterns
