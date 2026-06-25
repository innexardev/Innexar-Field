# Definition of Done

Uma tarefa só está **Done** quando todos os itens aplicáveis estão marcados:

## Código

- [ ] Implementa critérios de aceite da user story
- [ ] Segue ubiquitous language (`docs/domain/glossary.md`)
- [ ] Respeita bounded context (sem acesso cross-context direto)
- [ ] `tenant_id` em toda persistência quando aplicável
- [ ] Sem secrets hardcoded

## Qualidade

- [ ] Testes unitários para lógica de domínio
- [ ] Testes integração para endpoints novos (quando API)
- [ ] CI verde (lint + validate + test)
- [ ] Code review aprovado (1+ reviewer)

## Documentação

- [ ] ADR criado se decisão arquitetural nova
- [ ] OpenAPI atualizado se endpoint público novo
- [ ] README/runbook atualizado se operação mudou

## Deploy

- [ ] Merged em `develop` → deploy staging automático
- [ ] Smoke test staging OK
- [ ] Demo na sprint review (features user-facing)

## Não aplicável

Marque N/A em comentário do PR quando item não se aplica.
