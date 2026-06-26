package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Service handles subscription checkout and Stripe webhooks.
type Service struct {
	pool   *pgxpool.Pool
	cfg    *config.AppConfig
	stripe Client
}

func NewService(pool *pgxpool.Pool, cfg *config.AppConfig, stripe Client) *Service {
	return &Service{pool: pool, cfg: cfg, stripe: stripe}
}

type CheckoutRequest struct {
	PlanID     string `json:"plan_id"`
	SuccessURL string `json:"success_url"`
	CancelURL  string `json:"cancel_url"`
}

type tenantBilling struct {
	ID                string
	PlanID            string
	StripeCustomerID  *string
	OwnerEmail        string
	SubscriptionStatus string
}

func (s *Service) CreateCheckout(ctx context.Context, req CheckoutRequest) (*CheckoutResult, error) {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return nil, fmt.Errorf("tenant context required")
	}

	tb, err := s.loadTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	planID := req.PlanID
	if planID == "" {
		planID = tb.PlanID
	}

	plan, err := PlanFromConfig(s.cfg, planID)
	if err != nil {
		return nil, err
	}
	if plan.CustomPricing {
		return nil, fmt.Errorf("plan %q requires sales contact", planID)
	}
	if plan.StripePriceID == "" && !s.cfg.MockStripe() {
		return nil, fmt.Errorf("stripe_price_id not configured for plan %q", planID)
	}

	priceID := plan.StripePriceID
	if s.cfg.MockStripe() && priceID == "" {
		priceID = "price_mock_" + planID
	}

	appURL := env("WEB_APP_URL", "http://localhost:3000")
	successURL := req.SuccessURL
	if successURL == "" {
		successURL = appURL + "/billing/success"
	}
	cancelURL := req.CancelURL
	if cancelURL == "" {
		cancelURL = appURL + "/billing/cancel"
	}

	customerID := ""
	if tb.StripeCustomerID != nil {
		customerID = *tb.StripeCustomerID
	}

	result, err := s.stripe.CreateCheckoutSession(ctx, CheckoutParams{
		TenantID:      tenantID,
		PlanID:        planID,
		PriceID:       priceID,
		CustomerID:    customerID,
		CustomerEmail: tb.OwnerEmail,
		SuccessURL:    successURL,
		CancelURL:     cancelURL,
		TrialDays:     TrialDays(s.cfg),
	})
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *Service) HandleWebhook(ctx context.Context, payload []byte, sigHeader string) error {
	event, err := s.stripe.VerifyWebhook(payload, sigHeader)
	if err != nil {
		return err
	}

	switch event.Type {
	case "checkout.session.completed":
		return s.onCheckoutCompleted(ctx, event)
	case "customer.subscription.updated":
		return s.onSubscriptionUpdated(ctx, event)
	case "customer.subscription.deleted":
		return s.onSubscriptionDeleted(ctx, event)
	default:
		return nil
	}
}

func (s *Service) onCheckoutCompleted(ctx context.Context, event *WebhookEvent) error {
	obj, ok := event.Data["object"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("checkout.session.completed: missing object")
	}

	tenantID := metaString(obj, "tenant_id")
	planID := metaString(obj, "plan_id")
	if tenantID == "" {
		tenantID, _ = obj["client_reference_id"].(string)
	}
	if tenantID == "" {
		return fmt.Errorf("checkout.session.completed: tenant_id missing")
	}

	customerID, _ := obj["customer"].(string)
	subscriptionID, _ := obj["subscription"].(string)

	status := "active"
	if s.cfg.MockStripe() {
		status = "active"
	}

	_, err := s.pool.Exec(ctx, `
		UPDATE tenants SET
			plan_id = COALESCE(NULLIF($2, ''), plan_id),
			stripe_customer_id = COALESCE(NULLIF($3, ''), stripe_customer_id),
			stripe_subscription_id = COALESCE(NULLIF($4, ''), stripe_subscription_id),
			subscription_status = $5,
			updated_at = NOW()
		WHERE id = $1
	`, tenantID, planID, customerID, subscriptionID, status)
	return err
}

func (s *Service) onSubscriptionUpdated(ctx context.Context, event *WebhookEvent) error {
	obj, ok := event.Data["object"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("customer.subscription.updated: missing object")
	}
	tenantID := metaString(obj, "tenant_id")
	if tenantID == "" {
		if cust, ok := obj["customer"].(string); ok && cust != "" {
			return s.updateByCustomerID(ctx, cust, subscriptionObj(obj))
		}
		return nil
	}
	return s.applySubscription(ctx, tenantID, subscriptionObj(obj))
}

func (s *Service) onSubscriptionDeleted(ctx context.Context, event *WebhookEvent) error {
	obj, ok := event.Data["object"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("customer.subscription.deleted: missing object")
	}
	tenantID := metaString(obj, "tenant_id")
	if tenantID == "" {
		if cust, ok := obj["customer"].(string); ok && cust != "" {
			_, err := s.pool.Exec(ctx, `
				UPDATE tenants SET subscription_status = 'canceled', updated_at = NOW()
				WHERE stripe_customer_id = $1
			`, cust)
			return err
		}
		return nil
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE tenants SET subscription_status = 'canceled', updated_at = NOW() WHERE id = $1
	`, tenantID)
	return err
}

type subscriptionState struct {
	ID     string
	Status string
	PlanID string
}

func subscriptionObj(obj map[string]interface{}) subscriptionState {
	st := subscriptionState{}
	if id, ok := obj["id"].(string); ok {
		st.ID = id
	}
	if status, ok := obj["status"].(string); ok {
		st.Status = status
	}
	st.PlanID = metaString(obj, "plan_id")
	if st.PlanID == "" {
		if items, ok := obj["items"].(map[string]interface{}); ok {
			if data, ok := items["data"].([]interface{}); ok && len(data) > 0 {
				if item, ok := data[0].(map[string]interface{}); ok {
					if price, ok := item["price"].(map[string]interface{}); ok {
						if meta, ok := price["metadata"].(map[string]interface{}); ok {
							st.PlanID, _ = meta["plan_id"].(string)
						}
					}
				}
			}
		}
	}
	return st
}

func (s *Service) applySubscription(ctx context.Context, tenantID string, sub subscriptionState) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE tenants SET
			stripe_subscription_id = COALESCE(NULLIF($2, ''), stripe_subscription_id),
			subscription_status = COALESCE(NULLIF($3, ''), subscription_status),
			plan_id = COALESCE(NULLIF($4, ''), plan_id),
			updated_at = NOW()
		WHERE id = $1
	`, tenantID, sub.ID, sub.Status, sub.PlanID)
	return err
}

func (s *Service) updateByCustomerID(ctx context.Context, customerID string, sub subscriptionState) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE tenants SET
			stripe_subscription_id = COALESCE(NULLIF($2, ''), stripe_subscription_id),
			subscription_status = COALESCE(NULLIF($3, ''), subscription_status),
			plan_id = COALESCE(NULLIF($4, ''), plan_id),
			updated_at = NOW()
		WHERE stripe_customer_id = $1
	`, customerID, sub.ID, sub.Status, sub.PlanID)
	return err
}

func (s *Service) loadTenant(ctx context.Context, tenantID string) (*tenantBilling, error) {
	var tb tenantBilling
	var customerID *string
	err := s.pool.QueryRow(ctx, `
		SELECT t.id, t.plan_id, t.stripe_customer_id, t.subscription_status,
			(SELECT email FROM users WHERE tenant_id = t.id AND role = 'owner' LIMIT 1)
		FROM tenants t WHERE t.id = $1
	`, tenantID).Scan(&tb.ID, &tb.PlanID, &customerID, &tb.SubscriptionStatus, &tb.OwnerEmail)
	if err != nil {
		return nil, fmt.Errorf("tenant not found")
	}
	tb.StripeCustomerID = customerID
	return &tb, nil
}

func metaString(obj map[string]interface{}, key string) string {
	meta, ok := obj["metadata"].(map[string]interface{})
	if !ok {
		return ""
	}
	v, _ := meta[key].(string)
	return v
}

// MockWebhookPayload builds a test webhook body for mock mode.
func MockWebhookPayload(tenantID, planID string) []byte {
	payload := map[string]interface{}{
		"id":   "mock_evt_checkout",
		"type": "checkout.session.completed",
		"data": map[string]interface{}{
			"object": map[string]interface{}{
				"client_reference_id": tenantID,
				"customer":            "cus_mock_" + tenantID[:8],
				"subscription":        "sub_mock_" + tenantID[:8],
				"metadata": map[string]interface{}{
					"tenant_id": tenantID,
					"plan_id":   planID,
				},
			},
		},
	}
	b, _ := json.Marshal(payload)
	return b
}

// DefaultSuccessURL resolves checkout redirect from env and config.
func DefaultSuccessURL(cfg *config.AppConfig) string {
	if u := os.Getenv("WEB_APP_URL"); u != "" {
		return u + "/billing/success"
	}
	if domains, ok := cfg.Brand["domains"].(map[string]interface{}); ok {
		if app, ok := domains["app"].(string); ok && app != "" {
			return "https://" + app + "/billing/success"
		}
	}
	return "http://localhost:3000/billing/success"
}
