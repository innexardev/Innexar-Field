# Runbook: Deploy to Production

## Pré-requisitos

- [ ] PR merged em `main`
- [ ] CI verde (lint, config validate, tests)
- [ ] Staging validado (smoke tests)
- [ ] Change log atualizado
- [ ] Error budget > 25% restante

## Passos

1. Tag release: `git tag vX.Y.Z && git push origin vX.Y.Z`
2. GitHub Actions `deploy-production` dispara automaticamente
3. Blue-green: novo deploy em slot green
4. Smoke tests automáticos:
   - `GET /health/ready`
   - `POST /auth/login` (test user)
   - `GET /api/v1/industry-packs`
5. Switch traffic 100% → green
6. Monitor 30min: error rate, p95, Sentry
7. Anunciar em `#releases` Slack

## Rollback

Se smoke fail ou error rate > 2%: ver [rollback.md](rollback.md).

## Janela

Terça–Quinta 10:00–16:00 US Eastern (baixo tráfego field ops).
