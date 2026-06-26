package middleware

import (
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenantplugins"
	"github.com/gofiber/fiber/v2"
)

// RequireTenant rejects platform JWTs and requests without tenant_id.
func RequireTenant() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if claims, ok := c.Locals("claims").(*auth.Claims); ok && claims.IsPlatformAdmin {
			return fiber.NewError(fiber.StatusForbidden, "platform token not valid for tenant routes")
		}
		tid, ok := c.Locals("tenant_id").(string)
		if !ok || tid == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "tenant_id required")
		}
		return c.Next()
	}
}

var nonPluginRoutes = map[string]bool{
	"auth":          true,
	"users":         true,
	"nav":           true,
	"billing":       true,
	"debug":         true,
	"onboarding":    true,
	"marketplace":   true,
	"notifications": true,
	"integrations":  true,
	"reports":       true,
	"feature-flags": true,
	"public":        true,
	"platform":      true,
}

// PluginGate returns 403 when the request targets a disabled plugin.
func PluginGate(reg *plugin.Registry, plugins *tenantplugins.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		pluginID := pluginIDFromPath(c.Path())
		if pluginID == "" || nonPluginRoutes[pluginID] {
			return c.Next()
		}
		if _, ok := reg.Get(pluginID); !ok {
			return c.Next()
		}

		tid, ok := c.Locals("tenant_id").(string)
		if !ok || tid == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "tenant_id required")
		}

		enabled, err := plugins.IsEnabled(c.UserContext(), tid, pluginID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "plugin check failed")
		}
		if !enabled {
			return fiber.NewError(fiber.StatusForbidden, "plugin not enabled for tenant")
		}
		return c.Next()
	}
}

func pluginIDFromPath(path string) string {
	path = strings.TrimPrefix(path, "/api/v1/")
	path = strings.TrimPrefix(path, "/")
	if path == "" {
		return ""
	}
	if i := strings.IndexByte(path, '/'); i >= 0 {
		return path[:i]
	}
	return path
}
