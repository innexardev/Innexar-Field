package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BillingSettings are platform-wide subscription defaults (stored in platform_config).
type BillingSettings struct {
	TrialDays          int       `json:"trial_days"`
	DefaultPlanID      string    `json:"default_plan_id"`
	CheckoutSuccessURL string    `json:"checkout_success_url,omitempty"`
	CheckoutCancelURL  string    `json:"checkout_cancel_url,omitempty"`
	PortalReturnURL    string    `json:"portal_return_url,omitempty"`
	UpdatedAt          time.Time `json:"updated_at,omitempty"`
}

// BillingSettingsPatch is the admin PATCH body for billing settings.
type BillingSettingsPatch struct {
	TrialDays          *int   `json:"trial_days"`
	DefaultPlanID      string `json:"default_plan_id"`
	CheckoutSuccessURL string `json:"checkout_success_url"`
	CheckoutCancelURL  string `json:"checkout_cancel_url"`
	PortalReturnURL    string `json:"portal_return_url"`
}

// LoadBillingSettings reads platform billing settings, falling back to app config.
func LoadBillingSettings(ctx context.Context, pool *pgxpool.Pool, cfg *config.AppConfig) (BillingSettings, error) {
	out := defaultBillingSettings(cfg)
	if pool == nil {
		return out, nil
	}

	var raw []byte
	var updatedAt time.Time
	err := pool.QueryRow(ctx, `
		SELECT billing_settings, updated_at FROM platform_config WHERE id = 1
	`).Scan(&raw, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return out, nil
		}
		return out, fmt.Errorf("load billing settings: %w", err)
	}

	stored := map[string]interface{}{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &stored)
	}
	mergeBillingSettings(&out, stored)
	out.UpdatedAt = updatedAt
	return out, nil
}

// SaveBillingSettings persists billing settings to platform_config.
func SaveBillingSettings(ctx context.Context, pool *pgxpool.Pool, patch BillingSettingsPatch) (BillingSettings, error) {
	current, err := LoadBillingSettings(ctx, pool, nil)
	if err != nil {
		return BillingSettings{}, err
	}

	if patch.TrialDays != nil {
		if *patch.TrialDays < 0 {
			return BillingSettings{}, fmt.Errorf("trial_days must be non-negative")
		}
		current.TrialDays = *patch.TrialDays
	}
	if patch.DefaultPlanID != "" {
		current.DefaultPlanID = patch.DefaultPlanID
	}
	if patch.CheckoutSuccessURL != "" {
		current.CheckoutSuccessURL = patch.CheckoutSuccessURL
	}
	if patch.CheckoutCancelURL != "" {
		current.CheckoutCancelURL = patch.CheckoutCancelURL
	}
	if patch.PortalReturnURL != "" {
		current.PortalReturnURL = patch.PortalReturnURL
	}

	payload, err := json.Marshal(map[string]interface{}{
		"trial_days":           current.TrialDays,
		"default_plan_id":      current.DefaultPlanID,
		"checkout_success_url": current.CheckoutSuccessURL,
		"checkout_cancel_url":  current.CheckoutCancelURL,
		"portal_return_url":    current.PortalReturnURL,
	})
	if err != nil {
		return BillingSettings{}, err
	}

	_, err = pool.Exec(ctx, `
		UPDATE platform_config SET billing_settings = $1, updated_at = NOW() WHERE id = 1
	`, payload)
	if err != nil {
		return BillingSettings{}, fmt.Errorf("save billing settings: %w", err)
	}

	return LoadBillingSettings(ctx, pool, nil)
}

func defaultBillingSettings(cfg *config.AppConfig) BillingSettings {
	out := BillingSettings{TrialDays: TrialDays(cfg), DefaultPlanID: "starter"}
	if cfg != nil {
		if dp, ok := cfg.Pricing["default_plan"].(string); ok && dp != "" {
			out.DefaultPlanID = dp
		}
	}
	return out
}

func mergeBillingSettings(out *BillingSettings, stored map[string]interface{}) {
	if v, ok := stored["trial_days"].(float64); ok {
		out.TrialDays = int(v)
	}
	if v, ok := stored["trial_days"].(int); ok {
		out.TrialDays = v
	}
	if v, ok := stored["default_plan_id"].(string); ok && v != "" {
		out.DefaultPlanID = v
	}
	if v, ok := stored["checkout_success_url"].(string); ok {
		out.CheckoutSuccessURL = v
	}
	if v, ok := stored["checkout_cancel_url"].(string); ok {
		out.CheckoutCancelURL = v
	}
	if v, ok := stored["portal_return_url"].(string); ok {
		out.PortalReturnURL = v
	}
}

// DefaultPlanID resolves the platform default plan from DB settings with config fallback.
func DefaultPlanID(ctx context.Context, pool *pgxpool.Pool, cfg *config.AppConfig) string {
	settings, err := LoadBillingSettings(ctx, pool, cfg)
	if err != nil || settings.DefaultPlanID == "" {
		return "starter"
	}
	return settings.DefaultPlanID
}
