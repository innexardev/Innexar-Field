package integrations

import (
	"context"
	"encoding/json"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/events"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/jackc/pgx/v5/pgxpool"
)

const eventJobScheduled = "operations.job.scheduled"

// RegisterOutboxHandlers wires Google Calendar push and outbound webhooks on domain events.
func RegisterOutboxHandlers(poller *events.Poller, pool *pgxpool.Pool, cfg *config.AppConfig, resolver billing.SecretResolver) {
	if poller == nil || pool == nil || cfg == nil {
		return
	}
	gc := newGoogleCalendar(cfg, NewService(pool, cfg, resolver), pool, resolver)
	poller.RegisterHandlerChain(eventJobScheduled, func(ctx context.Context, tenantID, _ string, payload json.RawMessage) error {
		return gc.handleJobScheduled(ctx, tenantID, payload)
	})

	wh := newWebhookService(pool, cfg)
	for _, eventType := range SupportedWebhookEvents {
		et := eventType
		poller.RegisterHandlerChain(et, func(ctx context.Context, tenantID, _ string, payload json.RawMessage) error {
			return wh.deliverEvent(tenant.WithID(ctx, tenantID), tenantID, et, payload)
		})
	}
}
