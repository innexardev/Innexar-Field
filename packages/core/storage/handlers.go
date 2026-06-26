package storage

import (
	"errors"
	"io"

	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts authenticated tenant logo upload endpoints.
func RegisterRoutes(protected fiber.Router, svc *Service) {
	protected.Post("/tenant/logo/upload", func(c *fiber.Ctx) error {
		tenantID, ok := c.Locals("tenant_id").(string)
		if !ok || tenantID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing tenant context")
		}

		file, err := c.FormFile("logo")
		if err != nil {
			return fiber.NewError(400, "logo file required")
		}

		if file.Size > MaxLogoBytes {
			return fiber.NewError(400, ErrLogoTooLarge.Error())
		}

		f, err := file.Open()
		if err != nil {
			return fiber.NewError(400, "failed to read logo file")
		}
		defer f.Close()

		limited := io.LimitReader(f, MaxLogoBytes+1)
		data, err := io.ReadAll(limited)
		if err != nil {
			return fiber.NewError(400, "failed to read logo file")
		}

		result, err := svc.UploadLogo(c.UserContext(), tenantID, data)
		if err != nil {
			switch {
			case errors.Is(err, ErrLogoEmpty),
				errors.Is(err, ErrLogoTooLarge),
				errors.Is(err, ErrLogoInvalidType):
				return fiber.NewError(400, err.Error())
			default:
				return fiber.NewError(500, "failed to upload logo")
			}
		}
		return c.Status(201).JSON(result)
	})
}
