# Resilience Layer

Implementação dos padrões documentados em ADR-0004.

## Componentes (Fase 4)

| Arquivo | Responsabilidade |
|---------|------------------|
| `circuit_breaker.go` | Circuit breaker genérico |
| `retry.go` | Exponential backoff + jitter |
| `timeout.go` | Context timeouts padronizados |
| `bulkhead.go` | Limite concorrência por tenant |

## Uso

```go
stripeClient := resilience.Wrap(stripe.NewClient(key), resilience.Config{
    Name: "stripe",
    FailureThreshold: 5,
    OpenTimeout: 30 * time.Second,
})
```

## Status

Documentado — implementação pendente Fase 4.
