# Configuração Central — FieldForge

Fonte única de verdade para **brand**, **preços**, **debug** e **feature flags**.

## Arquivos

```
config/
├── app.config.yaml          # Config base (sempre editar aqui primeiro)
└── environments/
    ├── development.yaml     # Debug ligado, mocks ativos
    ├── staging.yaml         # Debug parcial
    └── production.yaml      # Debug desligado
```

## Uso

### TypeScript (Next.js / marketing / web)

```typescript
import { getConfig, isDebugFeature, brandCssVars } from "@fieldforge/config";

const config = getConfig();

// Brand dinâmico — nome pode mudar sem alterar componentes
document.title = config.brand.name;

// CSS variables no layout root
<style>{`:root { ${Object.entries(brandCssVars(config.brand.colors)).map(([k,v]) => `${k}: ${v}`).join(";")} }`}</style>

// Debug condicional
if (isDebugFeature(config, "mock_stripe")) {
  // usar Stripe test mode
}
```

### Go (API)

```go
// packages/core/config — carrega mesmo YAML no boot
cfg, err := config.Load(os.Getenv("APP_ENV"))
if cfg.Debug.Enabled && cfg.Debug.Features["api_trace"] {
    app.Use(middleware.APITrace())
}
```

### Variáveis de ambiente (sobrescrevem YAML)

| Variável | Efeito |
|----------|--------|
| `APP_ENV` | `development` \| `staging` \| `production` |
| `FF_DEBUG_ENABLED` | `true` / `false` |
| `FF_DEBUG_LOG_LEVEL` | `debug`, `info`, `warn` |
| `FF_BRAND_NAME` | Nome exibido no app |

## Debug em desenvolvimento

1. `debug.enabled: true` no `development.yaml`
2. Ativar features individuais em `debug.features`
3. Painel visual: `show_dev_panel: true` — overlay no canto do app
4. Endpoint (só dev): `GET /api/v1/debug/config` se `expose_config_endpoint: true`

**Nunca** ativar `bypass_auth` fora de dev local isolado.

## Preços (USD/mês)

| Plano | Preço | Público |
|-------|-------|---------|
| Starter | $25 | Solo / small crew |
| Business | $89 | Growing teams |
| Pro | $149 | Established contractors |
| Enterprise | from $299 | White-label / custom |

## Brand colors

Paleta premium definida em `brand.colors` — ver `app.config.yaml`.
Todos os apps consomem via CSS variables `--brand-*`.
