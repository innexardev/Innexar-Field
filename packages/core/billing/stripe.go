package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/resilience"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/webhook"
)

// CheckoutParams are inputs for a subscription checkout session.
type CheckoutParams struct {
	TenantID      string
	PlanID        string
	PriceID       string
	CustomerID    string
	CustomerEmail string
	SuccessURL    string
	CancelURL     string
	TrialDays     int
}

// CheckoutResult is returned after creating a checkout session.
type CheckoutResult struct {
	SessionID   string `json:"session_id"`
	CheckoutURL string `json:"checkout_url"`
	Mock        bool   `json:"mock,omitempty"`
}

// WebhookEvent is a normalized Stripe webhook payload.
type WebhookEvent struct {
	ID   string
	Type string
	Data map[string]interface{}
}

// Client abstracts Stripe API calls (real or mock).
type Client interface {
	CreateCheckoutSession(ctx context.Context, params CheckoutParams) (*CheckoutResult, error)
	VerifyWebhook(payload []byte, sigHeader string) (*WebhookEvent, error)
}

// NewClient returns a Stripe client based on config (mock when debug.mock_stripe=true).
// Live and mock clients are wrapped with a circuit breaker (ADR-0004).
func NewClient(cfg *config.AppConfig) Client {
	var inner Client
	if cfg.MockStripe() {
		inner = &MockClient{appURL: env("WEB_APP_URL", "http://localhost:3000")}
	} else {
		inner = &StripeClient{
			secretKey:     os.Getenv("STRIPE_SECRET_KEY"),
			webhookSecret: os.Getenv("STRIPE_WEBHOOK_SECRET"),
		}
	}
	return WrapWithBreaker(inner, resilience.DefaultManager(), "stripe")
}

// StripeClient calls the live Stripe API.
type StripeClient struct {
	secretKey     string
	webhookSecret string
}

func (c *StripeClient) CreateCheckoutSession(_ context.Context, params CheckoutParams) (*CheckoutResult, error) {
	if c.secretKey == "" {
		return nil, fmt.Errorf("STRIPE_SECRET_KEY is not set")
	}
	stripe.Key = c.secretKey

	customerID := params.CustomerID
	if customerID == "" {
		cust, err := customer.New(&stripe.CustomerParams{
			Email: stripe.String(params.CustomerEmail),
			Metadata: map[string]string{
				"tenant_id": params.TenantID,
			},
		})
		if err != nil {
			return nil, fmt.Errorf("create stripe customer: %w", err)
		}
		customerID = cust.ID
	}

	sessParams := &stripe.CheckoutSessionParams{
		Mode:              stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		Customer:          stripe.String(customerID),
		SuccessURL:        stripe.String(params.SuccessURL),
		CancelURL:         stripe.String(params.CancelURL),
		ClientReferenceID: stripe.String(params.TenantID),
		Metadata: map[string]string{
			"tenant_id": params.TenantID,
			"plan_id":   params.PlanID,
		},
		SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
			Metadata: map[string]string{
				"tenant_id": params.TenantID,
				"plan_id":   params.PlanID,
			},
		},
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{Price: stripe.String(params.PriceID), Quantity: stripe.Int64(1)},
		},
	}
	if params.TrialDays > 0 {
		sessParams.SubscriptionData.TrialPeriodDays = stripe.Int64(int64(params.TrialDays))
	}

	sess, err := session.New(sessParams)
	if err != nil {
		return nil, fmt.Errorf("create checkout session: %w", err)
	}
	return &CheckoutResult{SessionID: sess.ID, CheckoutURL: sess.URL}, nil
}

func (c *StripeClient) VerifyWebhook(payload []byte, sigHeader string) (*WebhookEvent, error) {
	if c.webhookSecret == "" {
		return nil, fmt.Errorf("STRIPE_WEBHOOK_SECRET is not set")
	}
	event, err := webhook.ConstructEvent(payload, sigHeader, c.webhookSecret)
	if err != nil {
		return nil, fmt.Errorf("verify webhook signature: %w", err)
	}
	return normalizeEvent(event)
}

// MockClient simulates Stripe when debug.mock_stripe=true.
type MockClient struct {
	appURL string
}

func (c *MockClient) CreateCheckoutSession(_ context.Context, params CheckoutParams) (*CheckoutResult, error) {
	sessionID := "mock_cs_" + uuid.New().String()[:12]
	checkoutURL := fmt.Sprintf("%s/billing/success?session=%s&mock=true&tenant_id=%s&plan_id=%s",
		c.appURL, sessionID, params.TenantID, params.PlanID)
	return &CheckoutResult{
		SessionID:   sessionID,
		CheckoutURL: checkoutURL,
		Mock:        true,
	}, nil
}

func (c *MockClient) VerifyWebhook(payload []byte, sigHeader string) (*WebhookEvent, error) {
	if sigHeader != "" && sigHeader != "mock" {
		return nil, fmt.Errorf("mock stripe: use Stripe-Signature: mock or omit header")
	}
	var raw struct {
		ID   string                 `json:"id"`
		Type string                 `json:"type"`
		Data map[string]interface{} `json:"data"`
	}
	if err := json.Unmarshal(payload, &raw); err != nil {
		return nil, fmt.Errorf("parse mock webhook: %w", err)
	}
	if raw.Type == "" {
		return nil, fmt.Errorf("mock webhook missing type")
	}
	return &WebhookEvent{ID: raw.ID, Type: raw.Type, Data: raw.Data}, nil
}

func normalizeEvent(event stripe.Event) (*WebhookEvent, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(event.Data.Raw, &data); err != nil {
		return nil, fmt.Errorf("parse event data: %w", err)
	}
	return &WebhookEvent{
		ID:   event.ID,
		Type: string(event.Type),
		Data: data,
	}, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
