package identity

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts authenticated identity endpoints under /users.
func RegisterRoutes(protected fiber.Router, svc *Service) {
	protected.Get("/users", func(c *fiber.Ctx) error {
		list, err := svc.ListUsers(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list users")
		}
		return response.DataList(c, list)
	})
}
