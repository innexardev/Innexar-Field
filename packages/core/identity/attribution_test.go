package identity

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeSignupAttribution_Empty(t *testing.T) {
	raw, err := NormalizeSignupAttribution(nil)
	require.NoError(t, err)
	assert.Nil(t, raw)

	raw, err = NormalizeSignupAttribution(&SignupMetadata{})
	require.NoError(t, err)
	assert.Nil(t, raw)
}

func TestNormalizeSignupAttribution_TrimsAndStores(t *testing.T) {
	raw, err := NormalizeSignupAttribution(&SignupMetadata{
		Ref:         "  partner-42  ",
		UTMSource:   "google",
		UTMCampaign: "spring-promo",
	})
	require.NoError(t, err)
	require.NotNil(t, raw)

	var stored SignupMetadata
	require.NoError(t, json.Unmarshal(raw, &stored))
	assert.Equal(t, "partner-42", stored.Ref)
	assert.Equal(t, "google", stored.UTMSource)
	assert.Equal(t, "spring-promo", stored.UTMCampaign)
	assert.Empty(t, stored.UTMMedium)
}

func TestNormalizeSignupAttribution_TruncatesLongValues(t *testing.T) {
	long := stringsRepeat("a", 300)
	raw, err := NormalizeSignupAttribution(&SignupMetadata{Ref: long})
	require.NoError(t, err)
	require.NotNil(t, raw)

	var stored SignupMetadata
	require.NoError(t, json.Unmarshal(raw, &stored))
	assert.Len(t, stored.Ref, maxAttributionFieldLen)
}

func stringsRepeat(s string, count int) string {
	out := make([]byte, 0, len(s)*count)
	for i := 0; i < count; i++ {
		out = append(out, s...)
	}
	return string(out)
}
