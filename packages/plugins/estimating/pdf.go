package estimating

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

func (p *Plugin) estimatePDF(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")

	var e Estimate
	var propertyID *string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), property_id::text, title, status, subtotal_cents, total_cents,
		       COALESCE(public_token, ''), created_at
		FROM estimates WHERE id = $1 AND tenant_id = $2
	`, id, tid).Scan(
		&e.ID, &e.CustomerID, &propertyID, &e.Title, &e.Status, &e.SubtotalCents, &e.TotalCents, &e.PublicToken, &e.CreatedAt,
	)
	if err != nil {
		return fiber.NewError(404, "not found")
	}

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT description, quantity, unit_price_cents
		FROM estimate_line_items WHERE estimate_id = $1 AND tenant_id = $2 ORDER BY created_at
	`, id, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load estimate")
	}
	defer rows.Close()

	var lines []documents.EstimateLine
	for rows.Next() {
		var l documents.EstimateLine
		if err := rows.Scan(&l.Description, &l.Quantity, &l.UnitCents); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load estimate")
		}
		lines = append(lines, l)
	}

	customerName := ""
	if e.CustomerID != "" {
		_ = p.pool.QueryRow(c.UserContext(), `
			SELECT name FROM customers WHERE id = $1::uuid AND tenant_id = $2
		`, e.CustomerID, tid).Scan(&customerName)
	}

	brand := documents.BrandFromConfig(p.appCfg)
	html := documents.RenderEstimateHTML(brand, documents.EstimateData{
		Title:         e.Title,
		Status:        e.Status,
		SubtotalCents: e.SubtotalCents,
		TotalCents:    e.TotalCents,
		CustomerName:  customerName,
		Lines:         lines,
	})
	return documents.SendHTMLAttachment(c, e.Title, html)
}
