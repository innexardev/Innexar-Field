package portal

import (
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type PortalBooking struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Status      string     `json:"status"`
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	Notes       string     `json:"notes,omitempty"`
}

func (p *Plugin) listBookings(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, title, status, scheduled_at, COALESCE(notes, '')
		FROM jobs
		WHERE tenant_id = $1
		  AND customer_id = $2::uuid
		  AND status NOT IN ('completed', 'cancelled')
		  AND (scheduled_at IS NULL OR scheduled_at >= NOW() - INTERVAL '1 day')
		ORDER BY scheduled_at NULLS LAST, created_at DESC
		LIMIT 50
	`, tid, cid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list bookings")
	}
	defer rows.Close()

	list := make([]PortalBooking, 0)
	for rows.Next() {
		var booking PortalBooking
		if err := rows.Scan(&booking.ID, &booking.Title, &booking.Status, &booking.ScheduledAt, &booking.Notes); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list bookings")
		}
		list = append(list, booking)
	}
	return response.DataList(c, list)
}
