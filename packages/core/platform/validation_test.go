package platform

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidLandingSection(t *testing.T) {
	assert.True(t, ValidLandingSection("hero"))
	assert.True(t, ValidLandingSection("features"))
	assert.True(t, ValidLandingSection("pricing"))
	assert.True(t, ValidLandingSection("footer"))
	assert.True(t, ValidLandingSection("promo"))
	assert.False(t, ValidLandingSection("banner"))
	assert.False(t, ValidLandingSection(""))
}

func TestValidateLandingContentHrefs(t *testing.T) {
	t.Run("allows safe hrefs", func(t *testing.T) {
		content := json.RawMessage(`{"cta_primary":{"href":"/signup"},"cta_secondary":{"href":"https://example.com"}}`)
		require.NoError(t, validateLandingContentHrefs(content))
	})

	t.Run("rejects javascript href", func(t *testing.T) {
		content := json.RawMessage(`{"href":"javascript:alert(1)"}`)
		err := validateLandingContentHrefs(content)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "dangerous URL scheme")
	})

	t.Run("rejects data href", func(t *testing.T) {
		content := json.RawMessage(`{"promo":{"href":"data:text/html,<script>alert(1)</script>"}}`)
		err := validateLandingContentHrefs(content)
		require.Error(t, err)
	})

	t.Run("rejects vbscript href", func(t *testing.T) {
		content := json.RawMessage(`{"href":"vbscript:msgbox(1)"}`)
		err := validateLandingContentHrefs(content)
		require.Error(t, err)
	})
}

func TestValidatePromotionFields(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)
	pct := 20
	cents := int64(500)
	maxRed := 10

	t.Run("valid percent discount", func(t *testing.T) {
		err := validatePromotionFields(promotionFields{
			DiscountPercent: &pct,
			StartsAt:        &start,
			EndsAt:          &end,
			MaxRedemptions:  &maxRed,
		})
		assert.NoError(t, err)
	})

	t.Run("valid cents discount", func(t *testing.T) {
		err := validatePromotionFields(promotionFields{DiscountCents: &cents})
		assert.NoError(t, err)
	})

	t.Run("rejects both discount types", func(t *testing.T) {
		err := validatePromotionFields(promotionFields{DiscountPercent: &pct, DiscountCents: &cents})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "not both")
	})

	t.Run("rejects missing discount", func(t *testing.T) {
		err := validatePromotionFields(promotionFields{})
		require.Error(t, err)
	})

	t.Run("rejects percent below 1", func(t *testing.T) {
		zero := 0
		err := validatePromotionFields(promotionFields{DiscountPercent: &zero})
		require.Error(t, err)
	})

	t.Run("rejects percent above 100", func(t *testing.T) {
		high := 101
		err := validatePromotionFields(promotionFields{DiscountPercent: &high})
		require.Error(t, err)
	})

	t.Run("rejects non-positive cents", func(t *testing.T) {
		zero := int64(0)
		err := validatePromotionFields(promotionFields{DiscountCents: &zero})
		require.Error(t, err)
	})

	t.Run("rejects ends before starts", func(t *testing.T) {
		err := validatePromotionFields(promotionFields{
			DiscountPercent: &pct,
			StartsAt:        &end,
			EndsAt:          &start,
		})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ends_at")
	})

	t.Run("rejects negative max redemptions", func(t *testing.T) {
		neg := -1
		err := validatePromotionFields(promotionFields{
			DiscountPercent: &pct,
			MaxRedemptions:  &neg,
		})
		require.Error(t, err)
	})
}

func TestIsDangerousHref(t *testing.T) {
	assert.True(t, isDangerousHref("javascript:alert(1)"))
	assert.True(t, isDangerousHref("  DATA:text/html,foo"))
	assert.True(t, isDangerousHref("vbscript:foo"))
	assert.False(t, isDangerousHref("/pricing"))
	assert.False(t, isDangerousHref("https://example.com"))
}

func TestValidatePlanID(t *testing.T) {
	assert.NoError(t, validatePlanID("starter"))
	assert.NoError(t, validatePlanID("pro_plus"))
	assert.Error(t, validatePlanID("Starter"))
	assert.Error(t, validatePlanID(""))
}

func TestValidateStripePriceID(t *testing.T) {
	assert.NoError(t, validateStripePriceID("price_abc123"))
	assert.Error(t, validateStripePriceID("prod_abc"))
}

func TestValidateBillingSettingsPatch(t *testing.T) {
	zero := 0
	assert.NoError(t, validateBillingSettingsPatch(billingSettingsFields{TrialDays: &zero}))
	assert.Error(t, validateBillingSettingsPatch(billingSettingsFields{
		CheckoutSuccessURL: "javascript:alert(1)",
	}))
}
