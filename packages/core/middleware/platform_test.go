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

func TestRequirePlatformAdmin_AllowsPlatformAdmin(t *testing.T) {
	app := fiber.New()
	app.Get("/test", injectPlatformClaims(true), RequirePlatformAdmin(), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestRequirePlatformAdmin_RejectsTenantUser(t *testing.T) {
	app := fiber.New()
	app.Get("/test", injectPlatformClaims(false), RequirePlatformAdmin(), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestRequirePlatformAdmin_RejectsTenantJWTWithTenantID(t *testing.T) {
	app := fiber.New()
	app.Get("/test", injectTenantClaims(), RequirePlatformAdmin(), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestRequirePlatformAdmin_RejectsMissingClaims(t *testing.T) {
	app := fiber.New()
	app.Get("/test", RequirePlatformAdmin(), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	_ = resp.Body.Close()
}

func injectPlatformClaims(isAdmin bool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims := &auth.Claims{UserID: "admin-1", Role: "owner"}
		if isAdmin {
			claims.IsPlatformAdmin = true
			claims.Role = "super_admin"
		}
		c.Locals("claims", claims)
		c.Locals("user_id", "admin-1")
		return c.Next()
	}
}

func injectTenantClaims() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Locals("claims", &auth.Claims{
			UserID:   "user-1",
			TenantID: "tenant-1",
			Email:    "owner@acme.com",
			Role:     "owner",
		})
		c.Locals("tenant_id", "tenant-1")
		c.Locals("user_id", "user-1")
		return c.Next()
	}
}
