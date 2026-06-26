package billing

import (
	"context"
	"errors"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/resilience"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubClient struct {
	failures int
	calls    int
}

func (s *stubClient) CreateCheckoutSession(_ context.Context, _ CheckoutParams) (*CheckoutResult, error) {
	s.calls++
	if s.calls <= s.failures {
		return nil, errors.New("stripe down")
	}
	return &CheckoutResult{SessionID: "cs_test"}, nil
}

func (s *stubClient) CreatePortalSession(_ context.Context, _ string, _ string) (*PortalResult, error) {
	return &PortalResult{PortalURL: "https://billing.example/portal"}, nil
}

func (s *stubClient) ListInvoices(_ context.Context, _ string) ([]Invoice, error) {
	return []Invoice{}, nil
}

func (s *stubClient) CreateInvoicePayment(_ context.Context, _ InvoicePaymentParams) (*InvoicePaymentResult, error) {
	return &InvoicePaymentResult{InvoiceID: "inv_test"}, nil
}

func (s *stubClient) VerifyWebhook(_ context.Context, _ []byte, _ string) (*WebhookEvent, error) {
	return &WebhookEvent{Type: "test"}, nil
}

func TestResilientClient_OpensCircuit(t *testing.T) {
	inner := &stubClient{failures: 10}
	mgr := resilience.NewManager(map[string]resilience.BreakerConfig{
		"stripe": {Threshold: 2, ResetTimeout: 0},
	})
	client := WrapWithBreaker(inner, mgr, "stripe")

	_, err := client.CreateCheckoutSession(context.Background(), CheckoutParams{})
	assert.Error(t, err)
	_, err = client.CreateCheckoutSession(context.Background(), CheckoutParams{})
	assert.Error(t, err)
	_, err = client.CreateCheckoutSession(context.Background(), CheckoutParams{})
	assert.Equal(t, resilience.ErrCircuitOpen, err)
}

func TestResilientClient_SucceedsWhenHealthy(t *testing.T) {
	inner := &stubClient{}
	client := WrapWithBreaker(inner, resilience.DefaultManager(), "stripe")
	res, err := client.CreateCheckoutSession(context.Background(), CheckoutParams{})
	require.NoError(t, err)
	assert.Equal(t, "cs_test", res.SessionID)
}
