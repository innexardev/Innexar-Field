package storage

import (
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts authenticated tenant logo upload endpoints.
func RegisterRoutes(protected fiber.Router, svc *Service) {
	protected.Post("/tenant/logo/upload", func(c *fiber.Ctx) error {
		tenantID, ok := c.Locals("tenant_id").(string)
		if !ok || tenantID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing tenant context")
		}

		data, err := ReadFormFile(c, "logo", MaxLogoBytes)
		if err != nil {
			if code, msg, ok := MapUploadError(err); ok {
				return fiber.NewError(code, msg)
			}
			return fiber.NewError(400, "logo file required")
		}

		result, err := svc.UploadLogo(c.UserContext(), tenantID, data)
		if err != nil {
			if code, msg, ok := MapUploadError(err); ok {
				return fiber.NewError(code, msg)
			}
			return fiber.NewError(500, "failed to upload logo")
		}
		return c.Status(201).JSON(result)
	})
}
