package billing

import (
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts authenticated billing checkout on protected.
func RegisterRoutes(protected fiber.Router, svc *Service) {
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
