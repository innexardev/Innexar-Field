package portal

import (
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type PortalQuoteLine struct {
	Description    string  `json:"description"`
	Quantity       float64 `json:"quantity"`
	UnitPriceCents int64   `json:"unit_price_cents"`
}

type PortalQuote struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Status        string    `json:"status"`
	SubtotalCents int64     `json:"subtotal_cents"`
	TotalCents    int64     `json:"total_cents"`
	CreatedAt     time.Time `json:"created_at"`
	Lines         []PortalQuoteLine `json:"lines,omitempty"`
}

func (p *Plugin) listQuotes(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, title, status, subtotal_cents, total_cents, created_at
		FROM estimates
		WHERE tenant_id = $1
		  AND customer_id = $2::uuid
		  AND status IN ('sent', 'accepted', 'rejected')
		ORDER BY created_at DESC
		LIMIT 50
	`, tid, cid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list quotes")
	}
	defer rows.Close()

	list := make([]PortalQuote, 0)
	for rows.Next() {
		var q PortalQuote
		if err := rows.Scan(&q.ID, &q.Title, &q.Status, &q.SubtotalCents, &q.TotalCents, &q.CreatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list quotes")
		}
		list = append(list, q)
	}
	return response.DataList(c, list)
}

func (p *Plugin) getQuote(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())
	id := c.Params("id")

	var q PortalQuote
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, title, status, subtotal_cents, total_cents, created_at
		FROM estimates
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3::uuid
		  AND status IN ('sent', 'accepted', 'rejected')
	`, id, tid, cid).Scan(&q.ID, &q.Title, &q.Status, &q.SubtotalCents, &q.TotalCents, &q.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "quote not found")
	}

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT description, quantity, unit_price_cents
		FROM estimate_line_items
		WHERE estimate_id = $1 AND tenant_id = $2
		ORDER BY created_at
	`, id, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load quote lines")
	}
	defer rows.Close()

	for rows.Next() {
		var line PortalQuoteLine
		if err := rows.Scan(&line.Description, &line.Quantity, &line.UnitPriceCents); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load quote lines")
		}
		q.Lines = append(q.Lines, line)
	}
	if q.Lines == nil {
		q.Lines = []PortalQuoteLine{}
	}
	return c.JSON(q)
}

func (p *Plugin) acceptQuote(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())
	id := c.Params("id")

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE estimates
		SET status = 'accepted', updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3::uuid AND status = 'sent'
	`, id, tid, cid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(400, "cannot accept quote")
	}

	if p.bus != nil {
		_ = p.bus.Publish(c.UserContext(), tid, "estimating.quote.accepted", map[string]string{
			"estimate_id": id,
			"source":      "client_portal",
		})
	}
	return c.JSON(fiber.Map{"status": "accepted", "estimate_id": id})
}
