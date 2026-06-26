package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequireRole_AllowsListedRole(t *testing.T) {
	app := fiber.New()
	app.Get("/test", injectClaims("admin"), RequireRole("admin", "accountant"), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest("GET", "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestRequireRole_AllowsOwnerRegardless(t *testing.T) {
	app := fiber.New()
	app.Get("/test", injectClaims("owner"), RequireRole("admin"), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest("GET", "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestRequireRole_RejectsInsufficientRole(t *testing.T) {
	app := fiber.New()
	app.Get("/test", injectClaims("field-tech"), RequireRole("admin", "accountant"), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest("GET", "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestRequireRole_RejectsMissingClaims(t *testing.T) {
	app := fiber.New()
	app.Get("/test", RequireRole("admin"), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest("GET", "/test", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	_ = resp.Body.Close()
}

func injectClaims(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Locals("claims", &auth.Claims{Role: role})
		return c.Next()
	}
}
