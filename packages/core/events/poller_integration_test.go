//go:build integration

package events

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPoller_SkipsDuplicateDelivery_Integration(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startEventsTestDB(t, ctx)
	defer cleanup()

	tenantID := uuid.New().String()
	workerCtx := tenant.WithWorker(ctx)

	bus := NewBus(pool.Pool)
	tenantCtx := tenant.WithID(ctx, tenantID)
	require.NoError(t, bus.Publish(tenantCtx, tenantID, "test.bus.duplicate", map[string]string{
		"key": "value",
	}))

	var eventID string
	err := pool.QueryRow(workerCtx, `
		SELECT id FROM domain_events
		WHERE tenant_id = $1 AND event_type = 'test.bus.duplicate'
	`, tenantID).Scan(&eventID)
	require.NoError(t, err)

	var handlerCalls int
	p := NewPoller(pool.Pool, WithConsumerName("integration-consumer"))
	p.RegisterHandler("test.bus.duplicate", func(_ context.Context, _, _ string, payload json.RawMessage) error {
		handlerCalls++
		assert.JSONEq(t, `{"key":"value"}`, string(payload))
		return nil
	})

	require.NoError(t, p.PollOnce(ctx))
	assert.Equal(t, 1, handlerCalls)

	_, err = pool.Exec(workerCtx, `
		UPDATE domain_events SET status = 'pending', processed_at = NULL WHERE id = $1
	`, eventID)
	require.NoError(t, err)

	require.NoError(t, p.PollOnce(ctx))
	assert.Equal(t, 1, handlerCalls, "redelivered event must be skipped via processed_events")

	var status string
	err = pool.QueryRow(workerCtx, `
		SELECT status FROM domain_events WHERE id = $1
	`, eventID).Scan(&status)
	require.NoError(t, err)
	assert.Equal(t, "processed", status)
}
