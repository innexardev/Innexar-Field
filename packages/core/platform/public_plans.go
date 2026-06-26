package platform

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
)

// PublicPlan is the signup/marketing view of a SaaS plan (no Stripe secrets).
type PublicPlan struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	PriceMonthly      *float64 `json:"price_monthly,omitempty"`
	PriceMonthlyCents *int64   `json:"price_monthly_cents,omitempty"`
	PriceFrom         *float64 `json:"price_from,omitempty"`
	Badge             *string  `json:"badge,omitempty"`
	Features          []string `json:"features,omitempty"`
}

func (s *Service) ListPublicPlans(ctx context.Context) ([]PublicPlan, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, price_monthly_cents, features
		FROM platform_plans
		WHERE active = true
		ORDER BY sort_order, id`)
	if err != nil {
		return nil, fmt.Errorf("list public plans: %w", err)
	}
	defer rows.Close()

	var list []PublicPlan
	for rows.Next() {
		var p PublicPlan
		var priceCents *int64
		var features json.RawMessage
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &priceCents, &features); err != nil {
			return nil, err
		}
		p.PriceMonthlyCents = priceCents
		if priceCents != nil {
			monthly := float64(*priceCents) / 100
			p.PriceMonthly = &monthly
		}
		p.Features = parsePlanFeatures(features)
		list = append(list, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(list) > 0 {
		return list, nil
	}
	if s.appCfg == nil {
		return []PublicPlan{}, nil
	}
	return publicPlansFromConfig(s.appCfg.Pricing), nil
}

func publicPlansFromConfig(pricing map[string]interface{}) []PublicPlan {
	plansRaw, ok := pricing["plans"].(map[string]interface{})
	if !ok {
		return []PublicPlan{}
	}
	ids := make([]string, 0, len(plansRaw))
	for id := range plansRaw {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	out := make([]PublicPlan, 0, len(ids))
	for _, id := range ids {
		entry, ok := plansRaw[id].(map[string]interface{})
		if !ok {
			continue
		}
		p := PublicPlan{
			ID:          stringField(entry, "id", id),
			Name:        stringField(entry, "name", id),
			Description: stringField(entry, "description", ""),
		}
		if v := numberField(entry["price_monthly"]); v != nil {
			p.PriceMonthly = v
			cents := int64(*v * 100)
			p.PriceMonthlyCents = &cents
		}
		if v := numberField(entry["price_from"]); v != nil {
			p.PriceFrom = v
		}
		if badge := stringField(entry, "badge", ""); badge != "" {
			p.Badge = &badge
		}
		p.Features = stringSliceField(entry["features"])
		out = append(out, p)
	}
	return out
}

func parsePlanFeatures(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return nil
	}
	var list []string
	if err := json.Unmarshal(raw, &list); err == nil {
		return list
	}
	return nil
}

func stringField(m map[string]interface{}, key, fallback string) string {
	if v, ok := m[key].(string); ok && v != "" {
		return v
	}
	return fallback
}

func numberField(v interface{}) *float64 {
	switch n := v.(type) {
	case int:
		f := float64(n)
		return &f
	case int64:
		f := float64(n)
		return &f
	case float64:
		return &n
	default:
		return nil
	}
}

func stringSliceField(v interface{}) []string {
	arr, ok := v.([]interface{})
	if !ok {
		return nil
	}
	out := make([]string, 0, len(arr))
	for _, item := range arr {
		if s, ok := item.(string); ok {
			out = append(out, s)
		}
	}
	return out
}
