package billing

import (
	"context"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/stretchr/testify/assert"
)

type staticResolver struct {
	secretKey string
}

func (s staticResolver) Resolve(_ context.Context, integrationKey, field, envVar string) string {
	if integrationKey == "stripe" && field == "secret_key" {
		return s.secretKey
	}
	return ""
}

func TestUseMockStripe_withoutKeys(t *testing.T) {
	cfg := &config.AppConfig{
		Debug: config.DebugConfig{
			Features: map[string]interface{}{"mock_stripe": true},
		},
	}
	assert.True(t, UseMockStripe(context.Background(), cfg, nil))
}

func TestUseMockStripe_withPlatformSettingsKey(t *testing.T) {
	cfg := &config.AppConfig{
		Debug: config.DebugConfig{
			Features: map[string]interface{}{"mock_stripe": true},
		},
	}
	resolver := staticResolver{secretKey: "sk_test_configured"}
	assert.False(t, UseMockStripe(context.Background(), cfg, resolver))
}

func TestUseMockStripe_productionConfig(t *testing.T) {
	cfg := &config.AppConfig{
		Debug: config.DebugConfig{
			Features: map[string]interface{}{"mock_stripe": false},
		},
	}
	assert.False(t, UseMockStripe(context.Background(), cfg, nil))
}

func TestResolverFromClient(t *testing.T) {
	resolver := staticResolver{secretKey: "sk_test"}
	inner := &StripeClient{resolver: resolver}
	client := WrapWithBreaker(inner, nil, "stripe")
	assert.Equal(t, resolver, ResolverFromClient(client))
}
