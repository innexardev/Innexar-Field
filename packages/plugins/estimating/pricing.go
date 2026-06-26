package estimating

import (
	"math"
	"strings"
)

// MatchRoomBasedTier returns the tier that exactly matches beds and baths.
func MatchRoomBasedTier(tiers []PriceBookTier, beds int, baths float64) (PriceBookTier, bool) {
	for _, tier := range tiers {
		if tier.Beds == beds && bathsEqual(tier.Baths, baths) {
			return tier, true
		}
	}
	return PriceBookTier{}, false
}

func bathsEqual(a, b float64) bool {
	return math.Abs(a-b) < 0.001
}

// ResolveRoomBasedUnitPrice picks the tier price when beds/baths match; otherwise flat unit price.
func ResolveRoomBasedUnitPrice(item PriceBookItem, beds int, baths float64) int64 {
	if item.PricingModel != "room_based" {
		return item.UnitPriceCents
	}
	if tier, ok := MatchRoomBasedTier(item.PricingTiers, beds, baths); ok {
		return tier.PriceCents
	}
	return item.UnitPriceCents
}

func priceBookByName(items []PriceBookItem) map[string]PriceBookItem {
	byName := make(map[string]PriceBookItem, len(items))
	for _, item := range items {
		byName[strings.ToLower(strings.TrimSpace(item.Name))] = item
	}
	return byName
}

func propertyHasRoomCounts(bedrooms *int, bathrooms *float64) bool {
	return bedrooms != nil && bathrooms != nil && *bedrooms > 0 && *bathrooms > 0
}
