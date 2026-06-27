package integrations

import (
	"context"
	"os"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
)

const twilioIntegrationKey = "twilio"

// TwilioCredentials holds resolved Twilio API credentials.
type TwilioCredentials struct {
	AccountSID string
	AuthToken  string
	FromNumber string
}

func TwilioAccountSID(ctx context.Context, resolver billing.SecretResolver) string {
	if v := os.Getenv("TWILIO_ACCOUNT_SID"); v != "" {
		return v
	}
	if resolver != nil {
		return resolver.Resolve(ctx, twilioIntegrationKey, "account_sid", "TWILIO_ACCOUNT_SID")
	}
	return ""
}

func TwilioAuthToken(ctx context.Context, resolver billing.SecretResolver) string {
	if v := os.Getenv("TWILIO_AUTH_TOKEN"); v != "" {
		return v
	}
	if resolver != nil {
		return resolver.Resolve(ctx, twilioIntegrationKey, "auth_token", "TWILIO_AUTH_TOKEN")
	}
	return ""
}

func TwilioFromNumber(ctx context.Context, resolver billing.SecretResolver) string {
	if v := os.Getenv("TWILIO_FROM_NUMBER"); v != "" {
		return v
	}
	if resolver != nil {
		return resolver.Resolve(ctx, twilioIntegrationKey, "from_number", "TWILIO_FROM_NUMBER")
	}
	return ""
}

func TwilioPlatformEnabled(ctx context.Context, resolver billing.SecretResolver) bool {
	if resolver == nil {
		return TwilioAccountSID(ctx, nil) != ""
	}
	enabled := resolver.Resolve(ctx, twilioIntegrationKey, "enabled", "TWILIO_ENABLED")
	switch enabled {
	case "1", "true", "yes", "on":
		return true
	default:
		return TwilioAccountSID(ctx, resolver) != "" && TwilioAuthToken(ctx, resolver) != ""
	}
}

func ResolvePlatformTwilio(ctx context.Context, resolver billing.SecretResolver) (TwilioCredentials, bool) {
	if !TwilioPlatformEnabled(ctx, resolver) {
		return TwilioCredentials{}, false
	}
	accountSID := TwilioAccountSID(ctx, resolver)
	authToken := TwilioAuthToken(ctx, resolver)
	fromNumber := TwilioFromNumber(ctx, resolver)
	if accountSID == "" || authToken == "" || fromNumber == "" {
		return TwilioCredentials{}, false
	}
	return TwilioCredentials{AccountSID: accountSID, AuthToken: authToken, FromNumber: fromNumber}, true
}

func UseMockTwilio(ctx context.Context, cfg *config.AppConfig, resolver billing.SecretResolver) bool {
	if cfg != nil && cfg.SkipSMSSend() {
		return true
	}
	return TwilioAccountSID(ctx, resolver) == ""
}
