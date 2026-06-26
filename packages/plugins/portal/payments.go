package portal

import (
	"fmt"
	"os"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type PortalPayment struct {
	ID            string     `json:"id"`
	InvoiceID     string     `json:"invoice_id,omitempty"`
	InvoiceNumber string     `json:"invoice_number,omitempty"`
	AmountCents   int64      `json:"amount_cents"`
	Status        string     `json:"status"`
	Method        string     `json:"method,omitempty"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type PaymentIntentResult struct {
	PaymentIntentID string `json:"payment_intent_id"`
	ClientSecret    string `json:"client_secret"`
	CheckoutURL     string `json:"checkout_url,omitempty"`
	AmountCents     int64  `json:"amount_cents"`
	InvoiceID       string `json:"invoice_id"`
	Mock            bool   `json:"mock,omitempty"`
}

func (p *Plugin) listPayments(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, invoice_number, total_cents, status, paid_at, created_at
		FROM invoices
		WHERE tenant_id = $1 AND customer_id = $2::uuid
			AND status IN ('sent', 'paid')
		ORDER BY created_at DESC
	`, tid, cid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list payments")
	}
	defer rows.Close()

	list := make([]PortalPayment, 0)
	for rows.Next() {
		var invID, num, status string
		var total int64
		var paidAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(&invID, &num, &total, &status, &paidAt, &createdAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list payments")
		}
		payStatus := "pending"
		if status == "paid" {
			payStatus = "received"
		}
		list = append(list, PortalPayment{
			ID:            invID,
			InvoiceID:     invID,
			InvoiceNumber: num,
			AmountCents:   total,
			Status:        payStatus,
			Method:        "card",
			PaidAt:        paidAt,
			CreatedAt:     createdAt,
		})
	}
	return response.DataList(c, list)
}

func (p *Plugin) createPaymentIntent(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())
	invoiceID := c.Params("id")

	var total int64
	var status, invoiceNumber string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT total_cents, status, invoice_number
		FROM invoices
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3::uuid
	`, invoiceID, tid, cid).Scan(&total, &status, &invoiceNumber)
	if err != nil {
		return fiber.NewError(404, "invoice not found")
	}
	if status != "sent" {
		return fiber.NewError(400, "invoice is not payable")
	}

	mock := billing.UseMockStripe(c.UserContext(), p.cfg, p.stripeResolver())
	if mock || p.stripe == nil {
		intentID := "pi_mock_" + invoiceID[:8]
		return c.JSON(PaymentIntentResult{
			PaymentIntentID: intentID,
			ClientSecret:    fmt.Sprintf("%s_secret_mock", intentID),
			CheckoutURL:     portalAppURL() + "/portal/payments?mock_pay=" + invoiceID,
			AmountCents:     total,
			InvoiceID:       invoiceID,
			Mock:            true,
		})
	}

	var customerEmail string
	_ = p.pool.QueryRow(c.UserContext(), `
		SELECT email FROM customers WHERE id = $1 AND tenant_id = $2
	`, cid, tid).Scan(&customerEmail)

	baseURL := portalAppURL()
	result, err := p.stripe.CreateInvoicePayment(c.UserContext(), billing.InvoicePaymentParams{
		TenantID:      tid,
		CustomerID:    cid,
		InvoiceID:     invoiceID,
		InvoiceNumber: invoiceNumber,
		AmountCents:   total,
		SuccessURL:    baseURL + "/portal/payments?paid=" + invoiceID,
		CancelURL:     baseURL + "/portal/payments",
		CustomerEmail: customerEmail,
	})
	if err != nil {
		return fiber.NewError(400, err.Error())
	}

	return c.JSON(PaymentIntentResult{
		PaymentIntentID: result.PaymentIntentID,
		ClientSecret:    result.ClientSecret,
		CheckoutURL:     result.CheckoutURL,
		AmountCents:     result.AmountCents,
		InvoiceID:       result.InvoiceID,
	})
}

func (p *Plugin) confirmPayment(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())
	invoiceID := c.Params("id")

	if !billing.UseMockStripe(c.UserContext(), p.cfg, p.stripeResolver()) {
		return fiber.NewError(400, "live payments are confirmed via Stripe Checkout or webhook")
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE invoices SET status = 'paid', paid_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3::uuid AND status = 'sent'
	`, invoiceID, tid, cid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(400, "cannot confirm payment")
	}

	if p.bus != nil {
		_ = p.bus.Publish(c.UserContext(), tid, "financial.invoice.paid", map[string]string{
			"invoice_id":  invoiceID,
			"source":      "client_portal",
			"customer_id": cid,
		})
	}

	return c.JSON(fiber.Map{"status": "paid", "invoice_id": invoiceID})
}

func portalAppURL() string {
	if u := os.Getenv("WEB_APP_URL"); u != "" {
		return u
	}
	return "http://localhost:3000"
}

func (p *Plugin) stripeResolver() billing.SecretResolver {
	return billing.ResolverFromClient(p.stripe)
}
