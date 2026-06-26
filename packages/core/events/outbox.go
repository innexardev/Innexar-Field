package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Bus writes domain events to the outbox table.
type Bus struct {
	pool *pgxpool.Pool
}

func NewBus(pool *pgxpool.Pool) *Bus {
	return &Bus{pool: pool}
}

func (b *Bus) Publish(ctx context.Context, tenantID, eventType string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = b.pool.Exec(ctx, `
		INSERT INTO domain_events (id, tenant_id, event_type, payload, created_at, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
	`, uuid.New().String(), tenantID, eventType, body, time.Now().UTC())
	return err
}

// OutboxMigration is the core events table migration.
const OutboxMigrationSQL = `
CREATE TABLE IF NOT EXISTS domain_events (
	id UUID PRIMARY KEY,
	tenant_id UUID NOT NULL,
	event_type TEXT NOT NULL,
	payload JSONB NOT NULL DEFAULT '{}',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	processed_at TIMESTAMPTZ,
	status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_domain_events_pending ON domain_events (status, created_at) WHERE status = 'pending';
`

// ProcessedEventsMigration is the idempotent consumer dedup table (ADR-0003).
const ProcessedEventsMigrationSQL = `
CREATE TABLE IF NOT EXISTS processed_events (
	event_id UUID NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
	consumer_name TEXT NOT NULL,
	processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	tenant_id UUID NOT NULL,
	PRIMARY KEY (event_id, consumer_name)
);
CREATE INDEX IF NOT EXISTS idx_processed_events_tenant ON processed_events (tenant_id);
`
