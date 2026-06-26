package invoicing

import (
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/documents"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

func (p *Plugin) registerConfig(deps plugin.Deps) {
	if cfg, ok := deps.Config.(*config.AppConfig); ok {
		p.appCfg = cfg
	}
}

func (p *Plugin) invoicePDF(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")

	var inv Invoice
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), COALESCE(job_id::text,''), invoice_number, status, total_cents, due_at, paid_at, created_at
		FROM invoices WHERE id = $1 AND tenant_id = $2
	`, id, tid).Scan(&inv.ID, &inv.CustomerID, &inv.JobID, &inv.InvoiceNumber, &inv.Status, &inv.TotalCents, &inv.DueAt, &inv.PaidAt, &inv.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "not found")
	}

	customerName := ""
	if inv.CustomerID != "" {
		_ = p.pool.QueryRow(c.UserContext(), `
			SELECT name FROM customers WHERE id = $1::uuid AND tenant_id = $2
		`, inv.CustomerID, tid).Scan(&customerName)
	}

	brand := documents.BrandFromConfig(p.appCfg)
	html := documents.RenderInvoiceHTML(brand, documents.InvoiceData{
		InvoiceNumber: inv.InvoiceNumber,
		Status:        inv.Status,
		TotalCents:    inv.TotalCents,
		DueAt:         inv.DueAt,
		PaidAt:        inv.PaidAt,
		CustomerName:  customerName,
	})
	return documents.SendHTMLAttachment(c, inv.InvoiceNumber, html)
}
