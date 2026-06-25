# Disaster Recovery — FieldForge

## Objetivos

| Métrica | Target |
|---------|--------|
| **RPO** (max data loss) | 1 hora |
| **RTO** (max downtime) | 4 horas |

## Backup

| Componente | Frequência | Retenção |
|------------|------------|----------|
| PostgreSQL | Continuous WAL + snapshot diário | 30 dias |
| Redis | Snapshot 6h | 7 dias |
| S3 uploads | Versioning + cross-region replica | 90 dias |
| Config secrets | Secrets manager versioning | 90 dias |

## Cenários

### 1. Corrupção DB single tenant

1. Identificar tenant_id afetado.
2. Restore point-in-time para schema/tenant.
3. Validar RLS isolado.
4. Comunicar tenant afetado.

### 2. Região cloud indisponível

1. Failover DNS para região secundária (Enterprise).
2. Promote read replica → primary.
3. RTO target 4h.

### 3. Deploy defeituoso

Ver [runbooks/rollback.md](runbooks/rollback.md).

## Testes de restore

| Teste | Frequência | Último | Próximo |
|-------|------------|--------|---------|
| Restore DB staging | Mensal | — | Antes beta |
| Full DR drill | Semestral | — | Pós go-live |

## Runbook rápido

```
1. Declarar incidente P1
2. Identificar escopo (full vs partial)
3. Se deploy: rollback imediato
4. Se data: PITR restore para staging primeiro
5. Validar smoke tests
6. Cutover produção
7. Post-mortem em 48h
```
