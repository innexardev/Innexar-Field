package billing

import (
	"context"
	"fmt"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Plan describes a SaaS subscription plan.
type Plan struct {
	ID            string
	Name          string
	StripePriceID string
	PriceMonthly  *float64
	CustomPricing bool
}

// PlanFromConfig resolves a plan by id from pricing config (fallback when DB has no row).
func PlanFromConfig(cfg *config.AppConfig, planID string) (*Plan, error) {
	return planFromConfig(cfg, planID)
}

// PlanFromStore resolves a plan by id; platform_plans is the source of truth when present.
func PlanFromStore(ctx context.Context, pool *pgxpool.Pool, cfg *config.AppConfig, planID string) (*Plan, error) {
	if pool != nil {
		plan, err := planFromDB(ctx, pool, planID, false)
		if err == nil {
			return plan, nil
		}
		if !isUnknownPlan(err) && cfg == nil {
			return nil, err
		}
	}
	return planFromConfig(cfg, planID)
}

// ActivePlanFromStore resolves an active plan for signup and new subscriptions.
func ActivePlanFromStore(ctx context.Context, pool *pgxpool.Pool, cfg *config.AppConfig, planID string) (*Plan, error) {
	if pool != nil {
		plan, err := planFromDB(ctx, pool, planID, true)
		if err == nil {
			return plan, nil
		}
		if !isUnknownPlan(err) && cfg == nil {
			return nil, err
		}
	}
	return planFromConfig(cfg, planID)
}

func planFromDB(ctx context.Context, pool *pgxpool.Pool, planID string, activeOnly bool) (*Plan, error) {
	var name, stripeID string
	var priceCents *int64
	var active bool
	err := pool.QueryRow(ctx, `
		SELECT name, price_monthly_cents, COALESCE(stripe_price_id, ''), active
		FROM platform_plans WHERE id = $1
	`, planID).Scan(&name, &priceCents, &stripeID, &active)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("unknown plan %q", planID)
	}
	if err != nil {
		return nil, fmt.Errorf("load plan %q: %w", planID, err)
	}
	if activeOnly && !active {
		return nil, fmt.Errorf("plan %q is not active", planID)
	}

	plan := &Plan{ID: planID, Name: name, StripePriceID: stripeID}
	if priceCents != nil {
		monthly := float64(*priceCents) / 100
		plan.PriceMonthly = &monthly
	} else {
		plan.CustomPricing = true
	}
	return plan, nil
}

func planFromConfig(cfg *config.AppConfig, planID string) (*Plan, error) {
	if cfg == nil {
		return nil, fmt.Errorf("unknown plan %q", planID)
	}
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

func isUnknownPlan(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return len(msg) >= 7 && msg[:7] == "unknown"
}

// TrialDays returns configured trial length from app config (default 14).
func TrialDays(cfg *config.AppConfig) int {
	if cfg == nil {
		return 14
	}
	if v, ok := cfg.Pricing["trial_days"].(int); ok && v >= 0 {
		return v
	}
	if v, ok := cfg.Pricing["trial_days"].(float64); ok && v >= 0 {
		return int(v)
	}
	return 14
}

// TrialDaysFromStore returns trial days from platform billing settings with config fallback.
func TrialDaysFromStore(ctx context.Context, pool *pgxpool.Pool, cfg *config.AppConfig) int {
	settings, err := LoadBillingSettings(ctx, pool, cfg)
	if err != nil {
		return TrialDays(cfg)
	}
	return settings.TrialDays
}
