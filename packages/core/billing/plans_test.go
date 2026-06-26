package billing

import (
	"context"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testPricingConfig() *config.AppConfig {
	return &config.AppConfig{
		Pricing: map[string]interface{}{
			"trial_days": 14,
			"plans": map[string]interface{}{
				"starter": map[string]interface{}{
					"id":              "starter",
					"name":            "Starter",
					"price_monthly":   25,
					"stripe_price_id": "price_starter",
				},
				"enterprise": map[string]interface{}{
					"id":            "enterprise",
					"name":          "Enterprise",
					"price_monthly": nil,
				},
			},
		},
	}
}

func TestPlanFromConfig(t *testing.T) {
	cfg := testPricingConfig()

	plan, err := PlanFromConfig(cfg, "starter")
	require.NoError(t, err)
	assert.Equal(t, "price_starter", plan.StripePriceID)
	assert.False(t, plan.CustomPricing)

	ent, err := PlanFromConfig(cfg, "enterprise")
	require.NoError(t, err)
	assert.True(t, ent.CustomPricing)
	assert.Equal(t, 14, TrialDays(cfg))
}

func TestPlanFromStore_FallsBackToConfig(t *testing.T) {
	cfg := testPricingConfig()
	plan, err := PlanFromStore(context.Background(), nil, cfg, "starter")
	require.NoError(t, err)
	assert.Equal(t, "Starter", plan.Name)
	assert.Equal(t, "price_starter", plan.StripePriceID)
}

func TestTrialDaysFromStore_FallsBackToConfig(t *testing.T) {
	cfg := testPricingConfig()
	assert.Equal(t, 14, TrialDaysFromStore(context.Background(), nil, cfg))
}

func TestDefaultBillingSettings(t *testing.T) {
	settings := defaultBillingSettings(testPricingConfig())
	assert.Equal(t, 14, settings.TrialDays)
	assert.Equal(t, "starter", settings.DefaultPlanID)
}

func TestMergeBillingSettings(t *testing.T) {
	out := BillingSettings{TrialDays: 14, DefaultPlanID: "starter"}
	mergeBillingSettings(&out, map[string]interface{}{
		"trial_days":      float64(0),
		"default_plan_id": "business",
	})
	assert.Equal(t, 0, out.TrialDays)
	assert.Equal(t, "business", out.DefaultPlanID)
}
