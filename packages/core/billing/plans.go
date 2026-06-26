package billing

import (
	"fmt"

	"github.com/fieldforge/fieldforge/packages/core/config"
)

// Plan describes a SaaS plan from app.config.yaml pricing.plans.
type Plan struct {
	ID            string
	Name          string
	StripePriceID string
	PriceMonthly  *float64
	CustomPricing bool
}

// PlanFromConfig resolves a plan by id from pricing config.
func PlanFromConfig(cfg *config.AppConfig, planID string) (*Plan, error) {
	plansRaw, ok := cfg.Pricing["plans"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("pricing plans not configured")
	}
	entry, ok := plansRaw[planID].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unknown plan %q", planID)
	}

	plan := &Plan{ID: planID}
	if name, ok := entry["name"].(string); ok {
		plan.Name = name
	}
	if sp, ok := entry["stripe_price_id"].(string); ok {
		plan.StripePriceID = sp
	}
	if pm, ok := entry["price_monthly"].(int); ok {
		v := float64(pm)
		plan.PriceMonthly = &v
	}
	if pm, ok := entry["price_monthly"].(float64); ok {
		plan.PriceMonthly = &pm
	}
	if entry["price_monthly"] == nil {
		plan.CustomPricing = true
	}
	return plan, nil
}

// TrialDays returns configured trial length (default 14).
func TrialDays(cfg *config.AppConfig) int {
	if v, ok := cfg.Pricing["trial_days"].(int); ok && v > 0 {
		return v
	}
	if v, ok := cfg.Pricing["trial_days"].(float64); ok && v > 0 {
		return int(v)
	}
	return 14
}
