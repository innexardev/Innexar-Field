package platform

import (
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/stretchr/testify/assert"
)

func TestPublicPlansFromConfig(t *testing.T) {
	cfg := &config.AppConfig{
		Pricing: map[string]interface{}{
			"plans": map[string]interface{}{
				"starter": map[string]interface{}{
					"id": "starter", "name": "Starter", "description": "Start",
					"price_monthly": 25,
					"features":      []interface{}{"A"},
				},
			},
		},
	}
	plans := publicPlansFromConfig(cfg.Pricing)
	assert.Len(t, plans, 1)
	assert.Equal(t, "starter", plans[0].ID)
	assert.NotNil(t, plans[0].PriceMonthly)

}
