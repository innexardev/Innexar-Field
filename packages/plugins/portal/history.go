package portal

import (
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type PortalHistoryItem struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Status      string     `json:"status"`
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Notes       string     `json:"notes,omitempty"`
}

func (p *Plugin) listHistory(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, title, status, scheduled_at, completed_at, COALESCE(notes, '')
		FROM jobs
		WHERE tenant_id = $1
		  AND customer_id = $2::uuid
		  AND status IN ('completed', 'cancelled')
		ORDER BY COALESCE(completed_at, scheduled_at, created_at) DESC
		LIMIT 100
	`, tid, cid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list history")
	}
	defer rows.Close()

	list := make([]PortalHistoryItem, 0)
	for rows.Next() {
		var item PortalHistoryItem
		if err := rows.Scan(&item.ID, &item.Title, &item.Status, &item.ScheduledAt, &item.CompletedAt, &item.Notes); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list history")
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}
