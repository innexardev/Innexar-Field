package portal

import (
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

func (p *Plugin) updateMe(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	var body struct {
		Name  *string `json:"name"`
		Email *string `json:"email"`
		Phone *string `json:"phone"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE customers SET
			name = COALESCE($3, name),
			email = COALESCE($4, email),
			phone = COALESCE($5, phone),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, cid, tid, body.Name, body.Email, body.Phone)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "customer not found")
	}
	return p.getMe(c)
}
