package billing

// RequiresPayment is true when the tenant must complete checkout before using the app.
func RequiresPayment(status string) bool {
	return status == "incomplete" || status == "pending_payment"
}

// RequiresDunning is true when payment failed and the tenant must update their card.
func RequiresDunning(status string) bool {
	return status == "past_due" || status == "unpaid"
}

// IsSubscriptionActive reports whether SaaS access should be granted.
func IsSubscriptionActive(status string) bool {
	return status == "active" || status == "trialing"
}

// BillingStatusResponse is returned by GET /billing/status.
type BillingStatusResponse struct {
	PlanID             string   `json:"plan_id"`
	PlanName           string   `json:"plan_name"`
	PriceMonthly       *float64 `json:"price_monthly,omitempty"`
	SubscriptionStatus string `json:"subscription_status"`
	StripeCustomerID   *string  `json:"stripe_customer_id,omitempty"`
	RequiresPayment    bool     `json:"requires_payment"`
	RequiresDunning    bool     `json:"requires_dunning"`
}

// PortalResult is returned after creating a Stripe Customer Portal session.
type PortalResult struct {
	PortalURL string `json:"portal_url"`
	Mock      bool   `json:"mock,omitempty"`
}

// Invoice is a normalized Stripe invoice for the tenant billing UI.
type Invoice struct {
	ID          string `json:"id"`
	Number      string `json:"number"`
	Status      string `json:"status"`
	AmountCents int64  `json:"amount_cents"`
	Currency    string `json:"currency"`
	CreatedAt   string `json:"created_at"`
	PDFURL      string `json:"pdf_url,omitempty"`
}
