package identity

import (
	"encoding/json"
	"strings"
)

const maxAttributionFieldLen = 256

// SignupMetadata carries referral and campaign attribution from marketing/signup.
type SignupMetadata struct {
	Ref         string `json:"ref,omitempty"`
	UTMSource   string `json:"utm_source,omitempty"`
	UTMMedium   string `json:"utm_medium,omitempty"`
	UTMCampaign string `json:"utm_campaign,omitempty"`
	UTMTerm     string `json:"utm_term,omitempty"`
	UTMContent  string `json:"utm_content,omitempty"`
}

// NormalizeSignupAttribution trims, bounds, and serializes attribution for storage.
// Returns nil when no attribution fields are present.
func NormalizeSignupAttribution(meta *SignupMetadata) (json.RawMessage, error) {
	if meta == nil {
		return nil, nil
	}
	normalized := SignupMetadata{
		Ref:         trimAttribution(meta.Ref),
		UTMSource:   trimAttribution(meta.UTMSource),
		UTMMedium:   trimAttribution(meta.UTMMedium),
		UTMCampaign: trimAttribution(meta.UTMCampaign),
		UTMTerm:     trimAttribution(meta.UTMTerm),
		UTMContent:  trimAttribution(meta.UTMContent),
	}
	if normalized == (SignupMetadata{}) {
		return nil, nil
	}
	raw, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func trimAttribution(value string) string {
	value = strings.TrimSpace(value)
	if len(value) > maxAttributionFieldLen {
		return value[:maxAttributionFieldLen]
	}
	return value
}
