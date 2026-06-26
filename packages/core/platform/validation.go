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
