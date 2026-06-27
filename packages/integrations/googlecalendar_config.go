package integrations

import (
	"context"
	"os"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
)

const googleCalendarIntegrationKey = "google_calendar"

func GoogleCalendarClientID(ctx context.Context, resolver billing.SecretResolver) string {
	if resolver != nil {
		if v := resolver.Resolve(ctx, googleCalendarIntegrationKey, "client_id", "GOOGLE_CALENDAR_CLIENT_ID"); v != "" {
			return v
		}
	}
	return os.Getenv("GOOGLE_CALENDAR_CLIENT_ID")
}

func GoogleCalendarClientSecret(ctx context.Context, resolver billing.SecretResolver) string {
	if resolver != nil {
		if v := resolver.Resolve(ctx, googleCalendarIntegrationKey, "client_secret", "GOOGLE_CALENDAR_CLIENT_SECRET"); v != "" {
			return v
		}
	}
	return os.Getenv("GOOGLE_CALENDAR_CLIENT_SECRET")
}

func UseMockGoogleCalendar(ctx context.Context, cfg *config.AppConfig, resolver billing.SecretResolver) bool {
	if cfg != nil && cfg.MockGoogleCalendar() {
		return GoogleCalendarClientID(ctx, resolver) == ""
	}
	return GoogleCalendarClientID(ctx, resolver) == ""
}
