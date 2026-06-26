package events

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler processes a single outbox event after it has been claimed.
type Handler func(ctx context.Context, tenantID, eventType string, payload json.RawMessage) error

const defaultConsumerName = "outbox-poller"

// Poller drains pending rows from domain_events and dispatches to handlers.
type Poller struct {
	pool          *pgxpool.Pool
	handlers      map[string]Handler
	fallback      Handler
	consumerName  string
	interval      time.Duration
	batch         int
	logger        *slog.Logger
	mu            sync.RWMutex
}

// PollerOption configures the outbox poller.
type PollerOption func(*Poller)

// WithInterval sets the poll interval (default 2s).
func WithInterval(d time.Duration) PollerOption {
	return func(p *Poller) { p.interval = d }
}

// WithBatchSize sets max events per poll (default 50).
func WithBatchSize(n int) PollerOption {
	return func(p *Poller) { p.batch = n }
}

// WithLogger sets structured logger for poll cycles.
func WithLogger(l *slog.Logger) PollerOption {
	return func(p *Poller) { p.logger = l }
}

// WithConsumerName sets the idempotency key for this poller (default outbox-poller).
func WithConsumerName(name string) PollerOption {
	return func(p *Poller) {
		if name != "" {
			p.consumerName = name
		}
	}
}

// NewPoller creates an outbox poller for domain_events.
func NewPoller(pool *pgxpool.Pool, opts ...PollerOption) *Poller {
	p := &Poller{
		pool:         pool,
		handlers:     make(map[string]Handler),
		consumerName: defaultConsumerName,
		interval:     2 * time.Second,
		batch:        50,
		logger:       slog.Default(),
		fallback:     defaultLogHandler,
	}
	for _, opt := range opts {
		opt(p)
	}
	return p
}

// RegisterHandler adds a handler for a specific event type.
func (p *Poller) RegisterHandler(eventType string, h Handler) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.handlers[eventType] = h
}

// SetFallbackHandler handles event types without a dedicated handler.
func (p *Poller) SetFallbackHandler(h Handler) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.fallback = h
}

// Run polls until ctx is cancelled.
func (p *Poller) Run(ctx context.Context) {
	if err := p.PollOnce(ctx); err != nil {
		p.logger.Error("outbox poll failed", "error", err)
	}

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := p.PollOnce(ctx); err != nil {
				p.logger.Error("outbox poll failed", "error", err)
			}
		}
	}
}

// PollOnce claims and processes a single batch of pending events.
func (p *Poller) PollOnce(ctx context.Context) error {
	workerCtx := tenant.WithWorker(ctx)

	tx, err := p.pool.Begin(workerCtx)
	if err != nil {
		return err
	}
	defer tx.Rollback(workerCtx)

	rows, err := tx.Query(workerCtx, `
		SELECT id, tenant_id::text, event_type, payload
		FROM domain_events
		WHERE status = 'pending'
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`, p.batch)
	if err != nil {
		return err
	}
	defer rows.Close()

	type pending struct {
		id        string
		tenantID  string
		eventType string
		payload   json.RawMessage
	}
	var batch []pending
	for rows.Next() {
		var ev pending
		if err := rows.Scan(&ev.id, &ev.tenantID, &ev.eventType, &ev.payload); err != nil {
			return err
		}
		batch = append(batch, ev)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, ev := range batch {
		if err := p.processEvent(workerCtx, tx, ev.id, ev.tenantID, ev.eventType, ev.payload); err != nil {
			p.logger.Error("outbox dispatch failed",
				"event_id", ev.id, "event_type", ev.eventType, "error", err)
			_, _ = tx.Exec(workerCtx, `
				UPDATE domain_events SET status = 'failed' WHERE id = $1
			`, ev.id)
		}
	}
	return tx.Commit(workerCtx)
}

func (p *Poller) processEvent(
	ctx context.Context,
	tx pgx.Tx,
	eventID, tenantID, eventType string,
	payload json.RawMessage,
) error {
	var alreadyProcessed bool
	err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM processed_events
			WHERE event_id = $1 AND consumer_name = $2
		)
	`, eventID, p.consumerName).Scan(&alreadyProcessed)
	if err != nil {
		return err
	}
	if alreadyProcessed {
		p.logger.Debug("skipping duplicate event delivery",
			"event_id", eventID, "consumer", p.consumerName)
		_, _ = tx.Exec(ctx, `
			UPDATE domain_events
			SET status = 'processed', processed_at = NOW()
			WHERE id = $1
		`, eventID)
		return nil
	}

	if err := p.dispatch(ctx, eventID, tenantID, eventType, payload); err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO processed_events (event_id, consumer_name, processed_at, tenant_id)
		VALUES ($1, $2, NOW(), $3)
	`, eventID, p.consumerName, tenantID)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		UPDATE domain_events
		SET status = 'processed', processed_at = NOW()
		WHERE id = $1
	`, eventID)
	return err
}

func (p *Poller) dispatch(ctx context.Context, id, tenantID, eventType string, payload json.RawMessage) error {
	p.mu.RLock()
	h, ok := p.handlers[eventType]
	fallback := p.fallback
	p.mu.RUnlock()

	handlerCtx := tenant.WithID(ctx, tenantID)
	if ok {
		return h(handlerCtx, tenantID, eventType, payload)
	}
	if fallback != nil {
		return fallback(handlerCtx, tenantID, eventType, payload)
	}
	return nil
}

func defaultLogHandler(_ context.Context, tenantID, eventType string, payload json.RawMessage) error {
	slog.Info("domain event published",
		"tenant_id", tenantID,
		"event_type", eventType,
		"payload", string(payload),
	)
	return nil
}
