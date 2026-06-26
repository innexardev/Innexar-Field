package events

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/db"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestPoller_DispatchFallback(t *testing.T) {
	t.Parallel()

	var handled []string
	p := NewPoller(nil, WithInterval(time.Millisecond))
	p.SetFallbackHandler(func(_ context.Context, _, eventType string, _ json.RawMessage) error {
		handled = append(handled, eventType)
		return nil
	})

	err := p.dispatch(tenant.WithWorker(context.Background()), "ev-1", "tenant-a", "test.event", json.RawMessage(`{}`))
	require.NoError(t, err)
	assert.Equal(t, []string{"test.event"}, handled)
}

func TestPoller_RegisterHandler(t *testing.T) {
	t.Parallel()

	p := NewPoller(nil)
	called := false
	p.RegisterHandler("ops.job.done", func(_ context.Context, _, _ string, _ json.RawMessage) error {
		called = true
		return nil
	})

	err := p.dispatch(context.Background(), "ev-1", "t1", "ops.job.done", nil)
	require.NoError(t, err)
	assert.True(t, called)
}

func TestPoller_WithConsumerName(t *testing.T) {
	t.Parallel()

	p := NewPoller(nil, WithConsumerName("scheduling"))
	assert.Equal(t, "scheduling", p.consumerName)

	defaultPoller := NewPoller(nil)
	assert.Equal(t, defaultConsumerName, defaultPoller.consumerName)
}

func TestPoller_SkipsDuplicateDelivery(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startEventsTestDB(t, ctx)
	defer cleanup()

	tenantID := uuid.New().String()
	eventID := uuid.New().String()
	workerCtx := tenant.WithWorker(ctx)

	_, err := pool.Exec(workerCtx, `
		INSERT INTO domain_events (id, tenant_id, event_type, payload, status)
		VALUES ($1, $2, 'test.duplicate', '{}', 'pending')
	`, eventID, tenantID)
	require.NoError(t, err)

	var handlerCalls int
	p := NewPoller(pool.Pool, WithConsumerName("test-consumer"))
	p.RegisterHandler("test.duplicate", func(_ context.Context, _, _ string, _ json.RawMessage) error {
		handlerCalls++
		return nil
	})

	require.NoError(t, p.PollOnce(ctx))
	assert.Equal(t, 1, handlerCalls)

	_, err = pool.Exec(workerCtx, `
		UPDATE domain_events SET status = 'pending', processed_at = NULL WHERE id = $1
	`, eventID)
	require.NoError(t, err)

	require.NoError(t, p.PollOnce(ctx))
	assert.Equal(t, 1, handlerCalls, "duplicate delivery must not invoke handler again")

	var processedCount int
	err = pool.QueryRow(workerCtx, `
		SELECT COUNT(*) FROM processed_events
		WHERE event_id = $1 AND consumer_name = 'test-consumer'
	`, eventID).Scan(&processedCount)
	require.NoError(t, err)
	assert.Equal(t, 1, processedCount)
}

func startEventsTestDB(t *testing.T, ctx context.Context) (*db.Pool, func()) {
	t.Helper()

	pg, err := tcpostgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:16-alpine"),
		tcpostgres.WithDatabase("fieldforge"),
		tcpostgres.WithUsername("fieldforge"),
		tcpostgres.WithPassword("fieldforge"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").WithOccurrence(2),
		),
	)
	if err != nil {
		t.Skipf("postgres testcontainer unavailable: %v", err)
	}

	connStr, err := pg.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	pool, err := db.Connect(ctx, connStr)
	require.NoError(t, err)

	var migrations []struct {
		Version int
		Name    string
		UpSQL   string
	}
	for _, m := range coremigrate.Core {
		if m.Version == 5 || m.Version == 9 || m.Version == 16 {
			migrations = append(migrations, struct {
				Version int
				Name    string
				UpSQL   string
			}{m.Version, m.Name, m.UpSQL})
		}
	}
	require.NoError(t, pool.RunMigrations(ctx, migrations))

	cleanup := func() {
		pool.Close()
		_ = pg.Terminate(ctx)
	}
	return pool, cleanup
}
