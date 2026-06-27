package integrations_test

import (
	"context"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/integrations"
	"github.com/stretchr/testify/assert"
)

type stubResolver map[string]string

func (s stubResolver) Resolve(_ context.Context, integrationKey, field, _ string) string {
	return s[integrationKey+":"+field]
}

func TestUseMockTwilio_skipFlag(t *testing.T) {
	cfg := &config.AppConfig{Debug: config.DebugConfig{Features: map[string]interface{}{"skip_sms_send": true}}}
	assert.True(t, integrations.UseMockTwilio(context.Background(), cfg, nil))
}

func TestResolvePlatformTwilio(t *testing.T) {
	resolver := stubResolver{
		"twilio:enabled": "true", "twilio:account_sid": "AC123",
		"twilio:auth_token": "secret", "twilio:from_number": "+15551234567",
	}
	creds, ok := integrations.ResolvePlatformTwilio(context.Background(), resolver)
	assert.True(t, ok)
	assert.Equal(t, "AC123", creds.AccountSID)
}

func TestTwilioSendLogOnly(t *testing.T) {
	cfg := &config.AppConfig{
		Debug: config.DebugConfig{Features: map[string]interface{}{"skip_sms_send": true}},
		Integrations: map[string]config.IntegrationConfig{"twilio": {ID: "twilio", Enabled: true}},
	}
	sender := integrations.NewTwilioSender(cfg, integrations.NewService(nil, cfg, nil), nil)
	result, err := sender.Send(context.Background(), integrations.TwilioSendRequest{To: "5551234567", Body: "Hello"})
	assert.NoError(t, err)
	assert.Equal(t, "log", result.Mode)
	assert.True(t, result.Mock)
}
