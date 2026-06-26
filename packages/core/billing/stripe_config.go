package billing

import (
	"context"
	"os"

	"github.com/fieldforge/fieldforge/packages/core/config"
)

const stripeIntegrationKey = "stripe"

// StripeSecretKey returns STRIPE_SECRET_KEY from env, else platform_settings (admin integrations).
func StripeSecretKey(ctx context.Context, resolver SecretResolver) string {
	if v := os.Getenv("STRIPE_SECRET_KEY"); v != "" {
		return v
	}
	if resolver != nil {
		return resolver.Resolve(ctx, stripeIntegrationKey, "secret_key", "STRIPE_SECRET_KEY")
	}
	return ""
}

// StripeWebhookSecret returns STRIPE_WEBHOOK_SECRET from env, else platform_settings.
func StripeWebhookSecret(ctx context.Context, resolver SecretResolver) string {
	if v := os.Getenv("STRIPE_WEBHOOK_SECRET"); v != "" {
		return v
	}
	if resolver != nil {
		return resolver.Resolve(ctx, stripeIntegrationKey, "webhook_secret", "STRIPE_WEBHOOK_SECRET")
	}
	return ""
}

// UseMockStripe is true when debug.mock_stripe is on and no Stripe secret is configured.
func UseMockStripe(ctx context.Context, cfg *config.AppConfig, resolver SecretResolver) bool {
	if cfg == nil || !cfg.MockStripe() {
		return false
	}
	return StripeSecretKey(ctx, resolver) == ""
}

// ResolverFromClient extracts the platform_settings resolver from a billing Client, if any.
func ResolverFromClient(client Client) SecretResolver {
	switch c := client.(type) {
	case *ResilientClient:
		return ResolverFromClient(c.inner)
	case *StripeClient:
		return c.resolver
	default:
		return nil
	}
}
