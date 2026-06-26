package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/resilience"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/customer"
	billingportal "github.com/stripe/stripe-go/v81/billingportal/session"
	"github.com/stripe/stripe-go/v81/invoice"
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
	CreatePortalSession(ctx context.Context, customerID, returnURL string) (*PortalResult, error)
	ListInvoices(ctx context.Context, customerID string) ([]Invoice, error)
	VerifyWebhook(payload []byte, sigHeader string) (*WebhookEvent, error)
}

// SecretResolver resolves integration credentials (DB with env override).
type SecretResolver interface {
	Resolve(ctx context.Context, integrationKey, field, envVar string) string
}

// NewClient returns a Stripe client based on config (mock when debug.mock_stripe=true).
// Live and mock clients are wrapped with a circuit breaker (ADR-0004).
func NewClient(cfg *config.AppConfig, resolver SecretResolver) Client {
	var inner Client
	if cfg.MockStripe() {
		inner = &MockClient{appURL: env("WEB_APP_URL", "http://localhost:3000")}
	} else {
		inner = &StripeClient{resolver: resolver}
	}
	return WrapWithBreaker(inner, resilience.DefaultManager(), "stripe")
}

// StripeClient calls the live Stripe API.
type StripeClient struct {
	resolver SecretResolver
}

func (c *StripeClient) secretKey(ctx context.Context) string {
	if c.resolver != nil {
		return c.resolver.Resolve(ctx, "stripe", "secret_key", "STRIPE_SECRET_KEY")
	}
	return os.Getenv("STRIPE_SECRET_KEY")
}

func (c *StripeClient) webhookSecret(ctx context.Context) string {
	if c.resolver != nil {
		return c.resolver.Resolve(ctx, "stripe", "webhook_secret", "STRIPE_WEBHOOK_SECRET")
	}
	return os.Getenv("STRIPE_WEBHOOK_SECRET")
}

func (c *StripeClient) CreateCheckoutSession(ctx context.Context, params CheckoutParams) (*CheckoutResult, error) {
	secretKey := c.secretKey(ctx)
	if secretKey == "" {
		return nil, fmt.Errorf("STRIPE_SECRET_KEY is not set")
	}
	stripe.Key = secretKey

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
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		Customer:   stripe.String(customerID),
		SuccessURL: stripe.String(params.SuccessURL),
		CancelURL:  stripe.String(params.CancelURL),
		// Card enables Apple Pay in Checkout when enabled in the Stripe Dashboard.
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		ClientReferenceID:  stripe.String(params.TenantID),
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

func (c *StripeClient) CreatePortalSession(ctx context.Context, customerID, returnURL string) (*PortalResult, error) {
	secretKey := c.secretKey(ctx)
	if secretKey == "" {
		return nil, fmt.Errorf("STRIPE_SECRET_KEY is not set")
	}
	stripe.Key = secretKey

	sess, err := billingportal.New(&stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnURL),
	})
	if err != nil {
		return nil, fmt.Errorf("create portal session: %w", err)
	}
	return &PortalResult{PortalURL: sess.URL}, nil
}

func (c *StripeClient) ListInvoices(ctx context.Context, customerID string) ([]Invoice, error) {
	secretKey := c.secretKey(ctx)
	if secretKey == "" {
		return nil, fmt.Errorf("STRIPE_SECRET_KEY is not set")
	}
	stripe.Key = secretKey

	params := &stripe.InvoiceListParams{Customer: stripe.String(customerID)}
	params.Limit = stripe.Int64(24)
	iter := invoice.List(params)

	out := make([]Invoice, 0)
	for iter.Next() {
		inv := iter.Invoice()
		out = append(out, normalizeInvoice(inv))
	}
	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("list invoices: %w", err)
	}
	return out, nil
}

func normalizeInvoice(inv *stripe.Invoice) Invoice {
	number := inv.Number
	if number == "" {
		number = inv.ID
	}
	pdf := ""
	if inv.InvoicePDF != "" {
		pdf = inv.InvoicePDF
	}
	return Invoice{
		ID:          inv.ID,
		Number:      number,
		Status:      string(inv.Status),
		AmountCents: inv.AmountDue,
		Currency:    string(inv.Currency),
		CreatedAt:   time.Unix(inv.Created, 0).UTC().Format(time.RFC3339),
		PDFURL:      pdf,
	}
}

func (c *StripeClient) VerifyWebhook(payload []byte, sigHeader string) (*WebhookEvent, error) {
	webhookSecret := c.webhookSecret(context.Background())
	if webhookSecret == "" {
		return nil, fmt.Errorf("STRIPE_WEBHOOK_SECRET is not set")
	}
	event, err := webhook.ConstructEvent(payload, sigHeader, webhookSecret)
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

func (c *MockClient) CreatePortalSession(_ context.Context, _ string, returnURL string) (*PortalResult, error) {
	return &PortalResult{PortalURL: returnURL + "?mock_portal=true", Mock: true}, nil
}

func (c *MockClient) ListInvoices(_ context.Context, _ string) ([]Invoice, error) {
	now := time.Now().UTC()
	return []Invoice{
		{
			ID:          "inv_mock_1",
			Number:      "INV-0001",
			Status:      "paid",
			AmountCents: 2500,
			Currency:    "usd",
			CreatedAt:   now.AddDate(0, -1, 0).Format(time.RFC3339),
		},
		{
			ID:          "inv_mock_2",
			Number:      "INV-0002",
			Status:      "paid",
			AmountCents: 2500,
			Currency:    "usd",
			CreatedAt:   now.Format(time.RFC3339),
		},
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
