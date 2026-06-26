package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequireTenant_RejectsPlatformToken(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		c.Locals("claims", &auth.Claims{
			UserID:          "admin-1",
			Email:           "admin@fieldforge.com",
			Role:            "super_admin",
			IsPlatformAdmin: true,
		})
		return c.Next()
	}, RequireTenant(), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestRequireTenant_AllowsTenantToken(t *testing.T) {
	app := fiber.New()
	app.Get("/test", func(c *fiber.Ctx) error {
		c.Locals("claims", &auth.Claims{
			UserID:   "user-1",
			TenantID: "tenant-1",
			Role:     "owner",
		})
		c.Locals("tenant_id", "tenant-1")
		return c.Next()
	}, RequireTenant(), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	_ = resp.Body.Close()
}
