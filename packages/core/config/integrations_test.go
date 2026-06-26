package config_test

import (
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegrationCatalog(t *testing.T) {
	cfg := &config.AppConfig{
		Integrations: map[string]config.IntegrationConfig{
			"quickbooks": {ID: "quickbooks", Name: "QuickBooks", Enabled: true},
			"avalara":    {ID: "avalara", Name: "Avalara", Enabled: false},
		},
		Debug: config.DebugConfig{
			Features: map[string]interface{}{
				"mock_avalara":    true,
				"mock_quickbooks": true,
			},
		},
	}

	catalog := cfg.IntegrationCatalog()
	require.Len(t, catalog, 1)
	assert.Equal(t, "quickbooks", catalog[0].ID)
	assert.True(t, cfg.MockAvalara())
	assert.True(t, cfg.MockQuickBooks())
	assert.Equal(t, 8.25, cfg.AvalaraMockRate())
}
