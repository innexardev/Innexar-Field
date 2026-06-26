package billing

import (
	"context"

	"github.com/fieldforge/fieldforge/packages/core/resilience"
)

// ResilientClient wraps a Stripe Client with circuit breaker protection.
type ResilientClient struct {
	inner   Client
	breaker *resilience.CircuitBreaker
}

// WrapWithBreaker returns a Client guarded by the named circuit breaker.
func WrapWithBreaker(inner Client, mgr *resilience.Manager, name string) Client {
	if mgr == nil {
		mgr = resilience.DefaultManager()
	}
	return &ResilientClient{inner: inner, breaker: mgr.Get(name)}
}

func (c *ResilientClient) CreateCheckoutSession(ctx context.Context, params CheckoutParams) (*CheckoutResult, error) {
	var result *CheckoutResult
	err := c.breaker.Execute(func() error {
		var innerErr error
		result, innerErr = c.inner.CreateCheckoutSession(ctx, params)
		return innerErr
	})
	return result, err
}

func (c *ResilientClient) VerifyWebhook(payload []byte, sigHeader string) (*WebhookEvent, error) {
	var result *WebhookEvent
	err := c.breaker.Execute(func() error {
		var innerErr error
		result, innerErr = c.inner.VerifyWebhook(payload, sigHeader)
		return innerErr
	})
	return result, err
}
