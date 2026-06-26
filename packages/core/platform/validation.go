package platform

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

var dangerousURLSchemes = []string{"javascript:", "data:", "vbscript:"}

func isDangerousHref(href string) bool {
	lower := strings.ToLower(strings.TrimSpace(href))
	for _, scheme := range dangerousURLSchemes {
		if strings.HasPrefix(lower, scheme) {
			return true
		}
	}
	return false
}

func validateLandingContentHrefs(content json.RawMessage) error {
	var v any
	if err := json.Unmarshal(content, &v); err != nil {
		return fmt.Errorf("invalid content JSON: %w", err)
	}
	return walkHrefs(v)
}

func walkHrefs(v any) error {
	switch x := v.(type) {
	case map[string]any:
		for k, val := range x {
			if k == "href" {
				if s, ok := val.(string); ok && isDangerousHref(s) {
					return fmt.Errorf("invalid href: dangerous URL scheme")
				}
			}
			if err := walkHrefs(val); err != nil {
				return err
			}
		}
	case []any:
		for _, item := range x {
			if err := walkHrefs(item); err != nil {
				return err
			}
		}
	}
	return nil
}

func validatePlanInput(in PlanInput, creating bool) error {
	id := strings.TrimSpace(in.ID)
	if creating {
		if id == "" {
			return fmt.Errorf("id is required")
		}
		if err := validatePlanID(id); err != nil {
			return err
		}
	}
	if creating && strings.TrimSpace(in.Name) == "" {
		return fmt.Errorf("name is required")
	}
	if in.Name != "" && strings.TrimSpace(in.Name) == "" {
		return fmt.Errorf("name cannot be blank")
	}
	if in.StripePriceID != "" {
		if err := validateStripePriceID(in.StripePriceID); err != nil {
			return err
		}
	}
	if in.PriceMonthlyCents != nil && *in.PriceMonthlyCents < 0 {
		return fmt.Errorf("price_monthly_cents must be non-negative")
	}
	if in.SortOrder != nil && *in.SortOrder < 0 {
		return fmt.Errorf("sort_order must be non-negative")
	}
	return nil
}

func validatePlanID(id string) error {
	if id == "" {
		return fmt.Errorf("id is required")
	}
	if len(id) > 64 {
		return fmt.Errorf("id must be at most 64 characters")
	}
	for i, r := range id {
		if i == 0 {
			if r < 'a' || r > 'z' {
				return fmt.Errorf("id must start with a lowercase letter")
			}
			continue
		}
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			continue
		}
		return fmt.Errorf("id may only contain lowercase letters, digits, hyphens, and underscores")
	}
	return nil
}

func validateStripePriceID(id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil
	}
	if !strings.HasPrefix(id, "price_") {
		return fmt.Errorf("stripe_price_id must start with price_")
	}
	return nil
}

func validateBillingURL(url string) error {
	url = strings.TrimSpace(url)
	if url == "" {
		return nil
	}
	if strings.HasPrefix(url, "/") {
		return nil
	}
	lower := strings.ToLower(url)
	if strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "http://localhost") {
		return nil
	}
	return fmt.Errorf("URL must be a path starting with / or an https:// URL")
}

func validateBillingSettingsPatch(f billingSettingsFields) error {
	if f.TrialDays != nil && *f.TrialDays < 0 {
		return fmt.Errorf("trial_days must be non-negative")
	}
	if err := validateBillingURL(f.CheckoutSuccessURL); err != nil {
		return fmt.Errorf("checkout_success_url: %w", err)
	}
	if err := validateBillingURL(f.CheckoutCancelURL); err != nil {
		return fmt.Errorf("checkout_cancel_url: %w", err)
	}
	if err := validateBillingURL(f.PortalReturnURL); err != nil {
		return fmt.Errorf("portal_return_url: %w", err)
	}
	return nil
}

type billingSettingsFields struct {
	TrialDays          *int
	DefaultPlanID      string
	CheckoutSuccessURL string
	CheckoutCancelURL  string
	PortalReturnURL    string
}

type promotionFields struct {
	DiscountPercent *int
	DiscountCents   *int64
	PlanID          string
	StartsAt        *time.Time
	EndsAt          *time.Time
	MaxRedemptions  *int
}

func validatePromotionFields(f promotionFields) error {
	hasPct := f.DiscountPercent != nil
	hasCents := f.DiscountCents != nil

	if hasPct && hasCents {
		return fmt.Errorf("set discount_percent or discount_cents, not both")
	}
	if !hasPct && !hasCents {
		return fmt.Errorf("discount_percent or discount_cents is required")
	}
	if hasPct {
		if *f.DiscountPercent < 1 || *f.DiscountPercent > 100 {
			return fmt.Errorf("discount_percent must be between 1 and 100")
		}
	}
	if hasCents {
		if *f.DiscountCents <= 0 {
			return fmt.Errorf("discount_cents must be positive")
		}
	}
	if f.StartsAt != nil && f.EndsAt != nil && !f.EndsAt.After(*f.StartsAt) {
		return fmt.Errorf("ends_at must be after starts_at")
	}
	if f.MaxRedemptions != nil && *f.MaxRedemptions < 0 {
		return fmt.Errorf("max_redemptions must be non-negative")
	}
	return nil
}

var validUserRoles = map[string]bool{
	"owner": true, "admin": true, "accountant": true, "dispatcher": true, "field-tech": true,
}

var validSubscriptionStatuses = map[string]bool{
	"trialing": true, "active": true, "incomplete": true, "pending_payment": true, "past_due": true, "unpaid": true, "canceled": true,
}

func validateUserRole(role string) error {
	if !validUserRoles[role] {
		return fmt.Errorf("invalid role %q", role)
	}
	return nil
}

func validateSubscriptionStatus(status string) error {
	if !validSubscriptionStatuses[status] {
		return fmt.Errorf("invalid subscription_status %q", status)
	}
	return nil
}
