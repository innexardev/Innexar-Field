package support

import (
	"errors"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts authenticated tenant support ticket endpoints.
func RegisterRoutes(protected fiber.Router, svc *Service) {
	protected.Get("/support/tickets", func(c *fiber.Ctx) error {
		list, err := svc.List(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list support tickets")
		}
		return response.DataList(c, list)
	})

	protected.Post("/support/tickets", func(c *fiber.Ctx) error {
		var body struct {
			Subject string `json:"subject"`
			Message string `json:"message"`
		}
		if err := c.BodyParser(&body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}

		ticket, err := svc.Create(c.UserContext(), body.Subject, body.Message)
		if err != nil {
			switch {
			case errors.Is(err, ErrSubjectRequired):
				return fiber.NewError(fiber.StatusBadRequest, "subject is required")
			case errors.Is(err, ErrMessageRequired):
				return fiber.NewError(fiber.StatusBadRequest, "message is required")
			default:
				return fiber.NewError(fiber.StatusInternalServerError, "failed to create support ticket")
			}
		}
		return c.Status(fiber.StatusCreated).JSON(ticket)
	})
}
