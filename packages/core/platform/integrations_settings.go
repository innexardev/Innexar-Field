package platform

import (
	"context"
	"fmt"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/platformsettings"
)

const (
	SettingStripe      = "stripe"
	SettingQuickBooks  = "quickbooks"
	SettingAvalara     = "avalara"
	SettingSMTP        = "smtp"
	SettingStorage     = "storage"
	SettingTwilio      = "twilio"
)

var integrationSecretFields = map[string][]string{
	SettingStripe:     {"secret_key", "publishable_key", "webhook_secret"},
	SettingQuickBooks: {"client_id", "client_secret"},
	SettingAvalara:    {"account_id", "license_key"},
	SettingSMTP:       {"password"},
	SettingStorage:    {"access_key_id", "secret_access_key"},
	SettingTwilio:     {"auth_token"},
}

// IntegrationsSettings is the masked view returned to platform admins.
type IntegrationsSettings struct {
	Stripe     map[string]interface{} `json:"stripe"`
	QuickBooks map[string]interface{} `json:"quickbooks"`
	Avalara    map[string]interface{} `json:"avalara"`
	SMTP       map[string]interface{} `json:"smtp"`
	Storage    map[string]interface{} `json:"storage"`
	Twilio     map[string]interface{} `json:"twilio"`
	UpdatedAt  time.Time              `json:"updated_at"`
}

type IntegrationsSettingsInput struct {
	Stripe     map[string]string `json:"stripe"`
	QuickBooks map[string]string `json:"quickbooks"`
	Avalara    map[string]string `json:"avalara"`
	SMTP       map[string]string `json:"smtp"`
	Storage    map[string]string `json:"storage"`
	Twilio     map[string]string `json:"twilio"`
}

func (s *Service) GetIntegrationsSettings(ctx context.Context) (*IntegrationsSettings, error) {
	if s.settings == nil {
		return nil, fmt.Errorf("platform settings store not configured")
	}
	out := &IntegrationsSettings{UpdatedAt: time.Now().UTC()}
	var err error
	if out.Stripe, err = s.settings.GetMasked(ctx, SettingStripe, integrationSecretFields[SettingStripe]); err != nil {
		return nil, err
	}
	if out.QuickBooks, err = s.settings.GetMasked(ctx, SettingQuickBooks, integrationSecretFields[SettingQuickBooks]); err != nil {
		return nil, err
	}
	if out.Avalara, err = s.settings.GetMasked(ctx, SettingAvalara, integrationSecretFields[SettingAvalara]); err != nil {
		return nil, err
	}
	if out.SMTP, err = s.settings.GetMasked(ctx, SettingSMTP, integrationSecretFields[SettingSMTP]); err != nil {
		return nil, err
	}
	if out.Storage, err = s.settings.GetMasked(ctx, SettingStorage, integrationSecretFields[SettingStorage]); err != nil {
		return nil, err
	}
	if out.Twilio, err = s.settings.GetMasked(ctx, SettingTwilio, integrationSecretFields[SettingTwilio]); err != nil {
		return nil, err
	}
	if ts, err := s.latestSettingsUpdatedAt(ctx); err == nil && !ts.IsZero() {
		out.UpdatedAt = ts
	}
	defaultBools(out)
	normalizeEnabled(out.Stripe)
	normalizeEnabled(out.QuickBooks)
	normalizeEnabled(out.Avalara)
	normalizeEnabled(out.SMTP)
	normalizeEnabled(out.Storage)
	normalizeEnabled(out.Twilio)
	return out, nil
}

func normalizeEnabled(block map[string]interface{}) {
	if v, ok := block["enabled"]; ok {
		switch x := v.(type) {
		case string:
			block["enabled"] = x == "true"
		case bool:
			block["enabled"] = x
		default:
			block["enabled"] = false
		}
	}
}

func defaultBools(out *IntegrationsSettings) {
	for _, block := range []map[string]interface{}{
		out.Stripe, out.QuickBooks, out.Avalara, out.SMTP, out.Storage, out.Twilio,
	} {
		if _, ok := block["enabled"]; !ok {
			block["enabled"] = false
		}
	}
}

func (s *Service) latestSettingsUpdatedAt(ctx context.Context) (time.Time, error) {
	var ts time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(MAX(updated_at), NOW()) FROM platform_settings
	`).Scan(&ts)
	return ts, err
}

func (s *Service) UpdateIntegrationsSettings(ctx context.Context, adminID string, in IntegrationsSettingsInput) (*IntegrationsSettings, error) {
	if s.settings == nil {
		return nil, fmt.Errorf("platform settings store not configured")
	}
	changed := []string{}
	if in.Stripe != nil {
		if err := s.settings.MergeAndSave(ctx, SettingStripe, in.Stripe, integrationSecretFields[SettingStripe], adminID); err != nil {
			return nil, err
		}
		changed = append(changed, SettingStripe)
	}
	if in.QuickBooks != nil {
		if err := s.settings.MergeAndSave(ctx, SettingQuickBooks, in.QuickBooks, integrationSecretFields[SettingQuickBooks], adminID); err != nil {
			return nil, err
		}
		changed = append(changed, SettingQuickBooks)
	}
	if in.Avalara != nil {
		if err := s.settings.MergeAndSave(ctx, SettingAvalara, in.Avalara, integrationSecretFields[SettingAvalara], adminID); err != nil {
			return nil, err
		}
		changed = append(changed, SettingAvalara)
	}
	if in.SMTP != nil {
		if err := s.settings.MergeAndSave(ctx, SettingSMTP, in.SMTP, integrationSecretFields[SettingSMTP], adminID); err != nil {
			return nil, err
		}
		changed = append(changed, SettingSMTP)
	}
	if in.Storage != nil {
		if err := s.settings.MergeAndSave(ctx, SettingStorage, in.Storage, integrationSecretFields[SettingStorage], adminID); err != nil {
			return nil, err
		}
		changed = append(changed, SettingStorage)
	}
	if in.Twilio != nil {
		if err := s.settings.MergeAndSave(ctx, SettingTwilio, in.Twilio, integrationSecretFields[SettingTwilio], adminID); err != nil {
			return nil, err
		}
		changed = append(changed, SettingTwilio)
	}
	if len(changed) > 0 {
		_ = s.audit(ctx, adminID, "update", "platform_settings", "integrations", map[string]interface{}{
			"integrations": changed,
		})
	}
	return s.GetIntegrationsSettings(ctx)
}

// SettingsStore exposes the underlying store for runtime secret resolution (billing, storage).
func (s *Service) SettingsStore() *platformsettings.Store {
	return s.settings
}
