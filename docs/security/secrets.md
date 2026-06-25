# Secrets Management

## Princípios

- Nunca commitar secrets no Git.
- Rotação programada e após incidente.
- Least privilege por serviço.

## Inventário

| Secret | Onde armazenar | Rotação |
|--------|----------------|---------|
| `DATABASE_URL` | Fly.io / AWS Secrets | 90 dias |
| `JWT_SIGNING_KEY` | Secrets manager | 90 dias, dual-key rollover |
| `STRIPE_SECRET_KEY` | Stripe dashboard + env | On compromise |
| `STRIPE_WEBHOOK_SECRET` | Env per endpoint | Per webhook recreate |
| `AVALARA_API_KEY` | Env | 180 dias |
| `TWILIO_AUTH_TOKEN` | Env | 180 dias |

## Rotação JWT (dual-key)

1. Adicionar `JWT_SIGNING_KEY_NEW` — API aceita tokens com ambas chaves.
2. Emitir novos tokens só com key nova.
3. Após TTL max token, remover key antiga.

## Desenvolvimento

- `.env` local gitignored.
- `debug.mock_stripe: true` — sem keys reais obrigatórias em dev.

## Auditoria

- Log de acesso a secrets manager (cloud audit trail).
- Alerta se secret aparece em log (regex scan CI).
