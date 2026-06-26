package billing

import (
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts authenticated billing endpoints on protected.
func RegisterRoutes(protected fiber.Router, svc *Service) {
	protected.Get("/billing/status", func(c *fiber.Ctx) error {
		status, err := svc.GetStatus(c.UserContext())
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})

	protected.Get("/billing/invoices", func(c *fiber.Ctx) error {
		invoices, err := svc.ListInvoices(c.UserContext())
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(fiber.Map{"data": invoices})
	})

	protected.Post("/billing/checkout", func(c *fiber.Ctx) error {
		var req CheckoutRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		result, err := svc.CreateCheckout(c.UserContext(), req)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(result)
	})

	protected.Post("/billing/portal", func(c *fiber.Ctx) error {
		var req PortalRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		result, err := svc.CreatePortal(c.UserContext(), req)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(result)
	})

	protected.Post("/billing/mock-complete", func(c *fiber.Ctx) error {
		var req struct {
			PlanID string `json:"plan_id"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		if err := svc.MockCompleteCheckout(c.UserContext(), req.PlanID); err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(fiber.Map{"ok": true})
	})
}

// WebhookHandler returns the public Stripe webhook endpoint (no auth).
func WebhookHandler(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		payload := c.Body()
		sig := c.Get("Stripe-Signature")
		if err := svc.HandleWebhook(c.UserContext(), payload, sig); err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(fiber.Map{"received": true})
	}
}
