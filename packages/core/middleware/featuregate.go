package middleware

import (
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/featureflags"
	"github.com/gofiber/fiber/v2"
)

// routeFeature maps API path prefixes to feature flag keys.
var routeFeature = map[string]string{
	"marketplace": "marketplace_plugins",
	"onboarding":  "onboarding_wizard",
}

// FeatureGate returns 403 when a route requires a disabled feature flag for the tenant.
func FeatureGate(flags *featureflags.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		flag := featureForPath(c.Path())
		if flag == "" {
			return c.Next()
		}

		tid, ok := c.Locals("tenant_id").(string)
		if !ok || tid == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "tenant_id required")
		}

		enabled, err := flags.IsEnabled(c.UserContext(), tid, flag)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "feature flag check failed")
		}
		if !enabled {
			return fiber.NewError(fiber.StatusForbidden, "feature not enabled")
		}
		return c.Next()
	}
}

func featureForPath(path string) string {
	path = strings.TrimPrefix(path, "/api/v1/")
	path = strings.TrimPrefix(path, "/")
	if path == "" {
		return ""
	}
	segment := path
	if i := strings.IndexByte(path, '/'); i >= 0 {
		segment = path[:i]
	}
	return routeFeature[segment]
}
