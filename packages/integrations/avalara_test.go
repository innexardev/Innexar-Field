package integrations

import (
	"context"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func avalaraTestCfg(mock bool, rate float64) *config.AppConfig {
	return &config.AppConfig{
		Debug: config.DebugConfig{
			Features: map[string]interface{}{"mock_avalara": mock},
		},
		Integrations: map[string]config.IntegrationConfig{
			"avalara": {
				ID:       config.IntegrationAvalara,
				Name:     "Avalara AvaTax",
				Enabled:  true,
				MockRate: rate,
			},
		},
	}
}

func TestAvalaraCalculateMockRate(t *testing.T) {
	svc := newAvalara(avalaraTestCfg(true, 10.0))

	result, err := svc.Calculate(context.Background(), AvalaraCalculateRequest{
		AmountCents: 5000,
		ShipToState: "CA",
		ShipToZip:   "90210",
	})
	require.NoError(t, err)
	assert.Equal(t, int64(500), result.TaxCents)
	assert.Equal(t, 10.0, result.RatePercent)
	assert.Equal(t, "CA 90210", result.Jurisdiction)
	assert.True(t, result.Mock)
}

func TestAvalaraCalculateLiveStub(t *testing.T) {
	svc := newAvalara(avalaraTestCfg(false, 8.25))

	result, err := svc.Calculate(context.Background(), AvalaraCalculateRequest{
		AmountCents: 10000,
		ShipToState: "TX",
	})
	require.NoError(t, err)
	assert.Equal(t, int64(0), result.TaxCents)
	assert.True(t, result.TaxPending)
	assert.False(t, result.Mock)
}

func TestAvalaraJurisdiction(t *testing.T) {
	assert.Equal(t, "TX 78701", avalaraJurisdiction("tx", "78701"))
	assert.Equal(t, "US", avalaraJurisdiction("", ""))
}
