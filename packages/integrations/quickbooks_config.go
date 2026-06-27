package integrations

import (
	"context"
	"os"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
)

const quickBooksIntegrationKey = "quickbooks"

// QuickBooksClientID returns QUICKBOOKS_CLIENT_ID from env, else platform_settings.
func QuickBooksClientID(ctx context.Context, resolver billing.SecretResolver) string {
	if v := os.Getenv("QUICKBOOKS_CLIENT_ID"); v != "" {
		return v
	}
	if resolver != nil {
		return resolver.Resolve(ctx, quickBooksIntegrationKey, "client_id", "QUICKBOOKS_CLIENT_ID")
	}
	return ""
}

// QuickBooksClientSecret returns QUICKBOOKS_CLIENT_SECRET from env, else platform_settings.
func QuickBooksClientSecret(ctx context.Context, resolver billing.SecretResolver) string {
	if v := os.Getenv("QUICKBOOKS_CLIENT_SECRET"); v != "" {
		return v
	}
	if resolver != nil {
		return resolver.Resolve(ctx, quickBooksIntegrationKey, "client_secret", "QUICKBOOKS_CLIENT_SECRET")
	}
	return ""
}

// UseMockQuickBooks is true when debug.mock_quickbooks is on and no QuickBooks client ID is configured.
func UseMockQuickBooks(ctx context.Context, cfg *config.AppConfig, resolver billing.SecretResolver) bool {
	if cfg == nil || !cfg.MockQuickBooks() {
		return false
	}
	return QuickBooksClientID(ctx, resolver) == ""
}
