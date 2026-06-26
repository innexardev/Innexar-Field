package notifications

import (
	"errors"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts authenticated notification endpoints on protected.
func RegisterRoutes(protected fiber.Router, svc *Service) {
	protected.Get("/notifications", func(c *fiber.Ctx) error {
		list, err := svc.List(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list notifications")
		}
		return response.DataList(c, list)
	})

	protected.Patch("/notifications/:id", func(c *fiber.Ctx) error {
		n, err := svc.MarkRead(c.UserContext(), c.Params("id"))
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				return fiber.NewError(fiber.StatusNotFound, "notification not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update notification")
		}
		return c.JSON(n)
	})
}
