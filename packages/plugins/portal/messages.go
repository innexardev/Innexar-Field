package portal

import (
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type PortalMessageThread struct {
	ID        string    `json:"id"`
	Subject   string    `json:"subject"`
	Preview   string    `json:"preview"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (p *Plugin) listMessages(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, subject, message, status, created_at, updated_at
		FROM portal_support_requests
		WHERE tenant_id = $1 AND customer_id = $2::uuid
		ORDER BY updated_at DESC
		LIMIT 50
	`, tid, cid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list messages")
	}
	defer rows.Close()

	list := make([]PortalMessageThread, 0)
	for rows.Next() {
		var thread PortalMessageThread
		var body string
		if err := rows.Scan(&thread.ID, &thread.Subject, &body, &thread.Status, &thread.CreatedAt, &thread.UpdatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list messages")
		}
		thread.Preview = messagePreview(body)
		list = append(list, thread)
	}
	return response.DataList(c, list)
}

func messagePreview(body string) string {
	trimmed := strings.TrimSpace(body)
	if len(trimmed) <= 120 {
		return trimmed
	}
	return trimmed[:117] + "..."
}
