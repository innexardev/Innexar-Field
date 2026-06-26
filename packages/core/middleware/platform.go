package middleware

import (
	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/gofiber/fiber/v2"
)

// RequirePlatformAdmin rejects tenant-scoped JWTs and requires super_admin platform role.
func RequirePlatformAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*auth.Claims)
		if !ok || !claims.IsPlatformAdmin || claims.TenantID != "" || claims.Role != "super_admin" {
			return fiber.NewError(fiber.StatusForbidden, "platform admin required")
		}
		return c.Next()
	}
}
