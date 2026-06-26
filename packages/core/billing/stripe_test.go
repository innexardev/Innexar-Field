package billing

import (
	"context"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMockClient_CreateCheckoutSession(t *testing.T) {
	client := &MockClient{appURL: "http://localhost:3000"}
	result, err := client.CreateCheckoutSession(context.Background(), CheckoutParams{
		TenantID: "tenant-1",
		PlanID:   "starter",
	})
	require.NoError(t, err)
	assert.True(t, result.Mock)
	assert.Contains(t, result.CheckoutURL, "mock=true")
	assert.Contains(t, result.CheckoutURL, "plan_id=starter")
}

func TestMockClient_VerifyWebhook(t *testing.T) {
	client := &MockClient{appURL: "http://localhost:3000"}
	payload := MockWebhookPayload("tenant-abc", "business")
	event, err := client.VerifyWebhook(payload, "mock")
	require.NoError(t, err)
	assert.Equal(t, "checkout.session.completed", event.Type)
}

func TestNewClient_MockMode(t *testing.T) {
	cfg := &config.AppConfig{
		Debug: config.DebugConfig{
			Features: map[string]interface{}{"mock_stripe": true},
		},
	}
	client := NewClient(cfg, nil)
	res, err := client.CreateCheckoutSession(context.Background(), CheckoutParams{
		TenantID: "tenant-1",
		PlanID:   "starter",
	})
	require.NoError(t, err)
	assert.True(t, res.Mock)
	assert.NotEmpty(t, res.CheckoutURL)
}
