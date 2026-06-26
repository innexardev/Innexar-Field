package estimating

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMatchRoomBasedTier_ExactMatch(t *testing.T) {
	tiers := []PriceBookTier{
		{Beds: 1, Baths: 1, PriceCents: 12000},
		{Beds: 2, Baths: 1, PriceCents: 15000},
		{Beds: 3, Baths: 2, PriceCents: 18500},
	}

	tier, ok := MatchRoomBasedTier(tiers, 3, 2)
	assert.True(t, ok)
	assert.Equal(t, int64(18500), tier.PriceCents)

	_, ok = MatchRoomBasedTier(tiers, 4, 2)
	assert.False(t, ok)
}

func TestMatchRoomBasedTier_FloatBath(t *testing.T) {
	tiers := []PriceBookTier{{Beds: 2, Baths: 1.5, PriceCents: 16000}}

	tier, ok := MatchRoomBasedTier(tiers, 2, 1.5)
	assert.True(t, ok)
	assert.Equal(t, int64(16000), tier.PriceCents)
}

func TestResolveRoomBasedUnitPrice(t *testing.T) {
	item := PriceBookItem{
		Name:           "Deep clean",
		UnitPriceCents: 10000,
		PricingModel:   "room_based",
		PricingTiers: []PriceBookTier{
			{Beds: 2, Baths: 1, PriceCents: 15000},
		},
	}

	assert.Equal(t, int64(15000), ResolveRoomBasedUnitPrice(item, 2, 1))
	assert.Equal(t, int64(10000), ResolveRoomBasedUnitPrice(item, 3, 2))
}

func TestResolveRoomBasedUnitPrice_FlatItem(t *testing.T) {
	item := PriceBookItem{Name: "Supplies", UnitPriceCents: 2500, PricingModel: "flat"}
	assert.Equal(t, int64(2500), ResolveRoomBasedUnitPrice(item, 3, 2))
}
