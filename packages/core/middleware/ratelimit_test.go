package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPublicRateLimit_BlocksExcess(t *testing.T) {
	app := fiber.New()
	cfg := config.RateLimitConfig{Requests: 2, WindowSeconds: 60}
	app.Get("/test", PublicRateLimit(cfg), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		resp, err := app.Test(req, -1)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)
		_ = resp.Body.Close()
	}

	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "1.2.3.4:1234"
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusTooManyRequests, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestTenantRateLimit_ScopedByTenant(t *testing.T) {
	cfg := config.RateLimitConfig{Requests: 1, WindowSeconds: 60}

	appA := fiber.New()
	appA.Get("/test", func(c *fiber.Ctx) error {
		c.Locals("tenant_id", "tenant-a")
		return c.Next()
	}, TenantRateLimit(cfg), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	_, _ = appA.Test(req, -1)
	respA, _ := appA.Test(req, -1)
	assert.Equal(t, fiber.StatusTooManyRequests, respA.StatusCode)
	_ = respA.Body.Close()

	appB := fiber.New()
	appB.Get("/test", func(c *fiber.Ctx) error {
		c.Locals("tenant_id", "tenant-b")
		return c.Next()
	}, TenantRateLimit(cfg), func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})
	respB, err := appB.Test(httptest.NewRequest("GET", "/test", nil), -1)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, respB.StatusCode)
	_ = respB.Body.Close()
}
