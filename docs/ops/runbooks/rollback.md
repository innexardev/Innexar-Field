# Runbook: Rollback

## Quando acionar

- Smoke tests pós-deploy falham
- Error rate > 2% por 5 minutos
- P1 incident ligado a release recente (< 2h)

## Passos (blue-green)

1. Switch traffic → blue (versão anterior)
2. Confirmar métricas normalizam em 5min
3. Criar incidente P1 se user-facing
4. Investigar green slot sem pressa
5. Fix forward ou descartar green

## Passos (database migration falhou)

1. **Não** rollback código se migration expand irreversível
2. Executar migration `down` se contract strategy
3. Restore PITR se corrupção (ver [disaster-recovery.md](../disaster-recovery.md))

## Comunicação

- Status page update em 15min
- Email tenants se downtime > 5min
