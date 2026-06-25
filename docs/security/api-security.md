# API Security

## Authentication

- Bearer JWT com `tenant_id`, `sub`, `roles`.
- Refresh token rotativo, revogável por user.

## Rate limiting

| Escopo | Limite | Janela |
|--------|--------|--------|
| IP público (signup, login) | 20 req | 1 min |
| API autenticada / tenant | 1000 req | 1 min |
| Webhook ingress | 500 req | 1 min |

Implementação: Redis sliding window no API gateway.

## Idempotency

Header obrigatório em:

- `POST /api/v1/billing/invoices`
- `POST /api/v1/billing/invoices/{id}/pay`
- `POST /api/v1/onboarding/complete`

Chave armazenada 24h; replay retorna mesma resposta.

## Headers de segurança (web)

```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; ...
```

## CORS

- `app.fieldforge.com` → API only.
- Marketing → sem credenciais cross-origin para API.

## Input validation

- Schema validation em todo POST/PATCH (OpenAPI generated).
- Max body 10MB; uploads via presigned S3 URL.
