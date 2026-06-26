package featureflags_test

import (
	"context"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/featureflags"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func stubLoader(overrides map[string]bool) func(context.Context, string) (map[string]bool, error) {
	return func(context.Context, string) (map[string]bool, error) {
		return overrides, nil
	}
}

func TestIsEnabledUsesTenantOverride(t *testing.T) {
	svc := featureflags.NewServiceWithLoader(&config.AppConfig{
		Features: map[string]bool{
			"onboarding_wizard":   true,
			"marketplace_plugins": false,
		},
	}, stubLoader(map[string]bool{"marketplace_plugins": true}))

	enabled, err := svc.IsEnabled(context.Background(), "tenant-1", "marketplace_plugins")
	require.NoError(t, err)
	assert.True(t, enabled)
}

func TestIsEnabledFallsBackToGlobal(t *testing.T) {
	svc := featureflags.NewServiceWithLoader(&config.AppConfig{
		Features: map[string]bool{"client_portal": true},
	}, stubLoader(map[string]bool{}))

	enabled, err := svc.IsEnabled(context.Background(), "tenant-1", "client_portal")
	require.NoError(t, err)
	assert.True(t, enabled)
}

func TestResolvedMergesGlobalAndTenant(t *testing.T) {
	svc := featureflags.NewServiceWithLoader(&config.AppConfig{
		Features: map[string]bool{
			"onboarding_wizard":   true,
			"marketplace_plugins": false,
		},
	}, stubLoader(map[string]bool{"marketplace_plugins": true}))

	resolved, err := svc.Resolved(context.Background(), "tenant-1")
	require.NoError(t, err)
	assert.True(t, resolved["onboarding_wizard"])
	assert.True(t, resolved["marketplace_plugins"])
}

func TestDefaultsJSON(t *testing.T) {
	svc := featureflags.NewServiceWithLoader(&config.AppConfig{
		Features: map[string]bool{"onboarding_wizard": true},
	}, stubLoader(nil))

	raw, err := svc.DefaultsJSON()
	require.NoError(t, err)
	assert.JSONEq(t, `{"onboarding_wizard":true}`, string(raw))
}
