package portal

import (
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type PortalScheduleSlot struct {
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
}

func (p *Plugin) listScheduleSlots(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	from, to := parsePortalScheduleRange(c.Query("from"), c.Query("to"))

	booked := make(map[int64]struct{})
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT scheduled_at
		FROM jobs
		WHERE tenant_id = $1
		  AND scheduled_at IS NOT NULL
		  AND scheduled_at >= $2
		  AND scheduled_at < $3
		  AND status NOT IN ('cancelled', 'completed')
	`, tid, from, to)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load schedule slots")
	}
	defer rows.Close()
	for rows.Next() {
		var at time.Time
		if err := rows.Scan(&at); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load schedule slots")
		}
		booked[at.UTC().Unix()] = struct{}{}
	}

	return response.DataList(c, generatePortalSlots(from, to, booked))
}

func (p *Plugin) createScheduleBooking(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	var body struct {
		Title       string `json:"title"`
		ScheduledAt string `json:"scheduled_at"`
		Notes       string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil || body.ScheduledAt == "" {
		return fiber.NewError(fiber.StatusBadRequest, "scheduled_at required")
	}
	scheduledAt, err := time.Parse(time.RFC3339, body.ScheduledAt)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid scheduled_at")
	}
	if scheduledAt.Before(time.Now().UTC()) {
		return fiber.NewError(fiber.StatusBadRequest, "scheduled_at must be in the future")
	}

	title := body.Title
	if title == "" {
		title = "Service request"
	}

	var conflict int
	err = p.pool.QueryRow(c.UserContext(), `
		SELECT COUNT(*) FROM jobs
		WHERE tenant_id = $1
		  AND scheduled_at = $2
		  AND status NOT IN ('cancelled', 'completed')
	`, tid, scheduledAt.UTC()).Scan(&conflict)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to validate slot")
	}
	if conflict > 0 {
		return fiber.NewError(fiber.StatusConflict, "slot no longer available")
	}

	id := uuid.New().String()
	_, err = p.pool.Exec(c.UserContext(), `
		INSERT INTO jobs (id, tenant_id, customer_id, title, status, scheduled_at, notes)
		VALUES ($1, $2, $3::uuid, $4, 'requested', $5, $6)
	`, id, tid, cid, title, scheduledAt.UTC(), body.Notes)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create booking")
	}

	if p.bus != nil {
		_ = p.bus.Publish(c.UserContext(), tid, "operations.job.scheduled", map[string]string{"job_id": id})
	}

	return c.Status(fiber.StatusCreated).JSON(PortalBooking{
		ID:          id,
		Title:       title,
		Status:      "requested",
		ScheduledAt: &scheduledAt,
		Notes:       body.Notes,
	})
}

func parsePortalScheduleRange(fromStr, toStr string) (time.Time, time.Time) {
	now := time.Now().UTC()
	from := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 0, 14)

	if fromStr != "" {
		if t, err := time.Parse(time.RFC3339, fromStr); err == nil {
			from = t.UTC()
		} else if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t.UTC()
		}
	}
	if toStr != "" {
		if t, err := time.Parse(time.RFC3339, toStr); err == nil {
			to = t.UTC()
		} else if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t.UTC().Add(24 * time.Hour)
		}
	}
	if !to.After(from) {
		to = from.AddDate(0, 0, 14)
	}
	return from, to
}

func generatePortalSlots(from, to time.Time, booked map[int64]struct{}) []PortalScheduleSlot {
	const slotHours = 2
	slots := make([]PortalScheduleSlot, 0)
	cursor := from.UTC()

	for cursor.Before(to) {
		weekday := cursor.Weekday()
		if weekday >= time.Monday && weekday <= time.Friday {
			for hour := 9; hour <= 17-slotHours; hour += slotHours {
				start := time.Date(cursor.Year(), cursor.Month(), cursor.Day(), hour, 0, 0, 0, time.UTC)
				if start.Before(from) || !start.Before(to) || start.Before(time.Now().UTC()) {
					continue
				}
				if _, taken := booked[start.Unix()]; taken {
					continue
				}
				end := start.Add(time.Duration(slotHours) * time.Hour)
				slots = append(slots, PortalScheduleSlot{StartsAt: start, EndsAt: end})
			}
		}
		cursor = cursor.Add(24 * time.Hour)
	}
	return slots
}
