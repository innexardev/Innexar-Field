package portal

import (
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type PortalInvoice struct {
	ID            string     `json:"id"`
	InvoiceNumber string     `json:"invoice_number"`
	Status        string     `json:"status"`
	TotalCents    int64      `json:"total_cents"`
	DueAt         *time.Time `json:"due_at,omitempty"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

func (p *Plugin) listInvoices(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, invoice_number, status, total_cents, due_at, paid_at, created_at
		FROM invoices
		WHERE tenant_id = $1 AND customer_id = $2::uuid
			AND status IN ('sent', 'paid')
		ORDER BY created_at DESC
	`, tid, cid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list invoices")
	}
	defer rows.Close()

	list := make([]PortalInvoice, 0)
	for rows.Next() {
		var inv PortalInvoice
		if err := rows.Scan(&inv.ID, &inv.InvoiceNumber, &inv.Status, &inv.TotalCents, &inv.DueAt, &inv.PaidAt, &inv.CreatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list invoices")
		}
		list = append(list, inv)
	}
	return response.DataList(c, list)
}

func (p *Plugin) getInvoice(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	var inv PortalInvoice
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, invoice_number, status, total_cents, due_at, paid_at, created_at
		FROM invoices
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3::uuid
			AND status IN ('sent', 'paid')
	`, c.Params("id"), tid, cid).Scan(
		&inv.ID, &inv.InvoiceNumber, &inv.Status, &inv.TotalCents, &inv.DueAt, &inv.PaidAt, &inv.CreatedAt,
	)
	if err != nil {
		return fiber.NewError(404, "invoice not found")
	}
	return c.JSON(inv)
}
