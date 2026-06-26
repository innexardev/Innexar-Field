package portal

import (
	"fmt"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
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
	var status string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT total_cents, status
		FROM invoices
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3::uuid
	`, invoiceID, tid, cid).Scan(&total, &status)
	if err != nil {
		return fiber.NewError(404, "invoice not found")
	}
	if status != "sent" {
		return fiber.NewError(400, "invoice is not payable")
	}

	intentID := "pi_mock_" + uuid.New().String()[:12]
	mock := p.cfg != nil && p.cfg.MockStripe()
	result := PaymentIntentResult{
		PaymentIntentID: intentID,
		ClientSecret:    fmt.Sprintf("%s_secret_%s", intentID, uuid.New().String()[:8]),
		AmountCents:     total,
		InvoiceID:       invoiceID,
		Mock:            mock,
	}
	return c.JSON(result)
}

func (p *Plugin) confirmPayment(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())
	invoiceID := c.Params("id")

	if p.cfg == nil || !p.cfg.MockStripe() {
		return fiber.NewError(501, "live Stripe payment confirmation not wired yet; use webhook")
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
