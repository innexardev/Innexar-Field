package portal

import (
	"log"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type PortalSupportRequest struct {
	ID        string    `json:"id"`
	Subject   string    `json:"subject"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func (p *Plugin) createSupportRequest(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	var body struct {
		Subject string `json:"subject"`
		Message string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}

	subject := strings.TrimSpace(body.Subject)
	message := strings.TrimSpace(body.Message)
	if subject == "" {
		return fiber.NewError(400, "subject is required")
	}
	if message == "" {
		return fiber.NewError(400, "message is required")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO portal_support_requests (id, tenant_id, customer_id, subject, message)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`, id, tid, cid, subject, message).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create support request")
	}

	if p.cfg != nil {
		if skipEmail, ok := p.cfg.Debug.Features["skip_email_send"].(bool); ok && skipEmail {
			log.Printf("portal support request (skip_email_send): tenant=%s customer=%s id=%s subject=%q",
				tid, cid, id, subject)
		}
	}

	return c.Status(201).JSON(PortalSupportRequest{
		ID:        id,
		Subject:   subject,
		Message:   message,
		Status:    "open",
		CreatedAt: createdAt,
	})
}
