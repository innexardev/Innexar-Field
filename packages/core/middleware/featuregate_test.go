package middleware_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/featureflags"
	"github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func stubFlags(overrides map[string]bool) *featureflags.Service {
	return featureflags.NewServiceWithLoader(&config.AppConfig{
		Features: map[string]bool{"marketplace_plugins": false},
	}, func(context.Context, string) (map[string]bool, error) {
		return overrides, nil
	})
}

func TestFeatureGateBlocksDisabledMarketplace(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("tenant_id", "tenant-1")
		return c.Next()
	})
	app.Use(middleware.FeatureGate(stubFlags(map[string]bool{"marketplace_plugins": false})))
	app.Get("/api/v1/marketplace/plugins", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/marketplace/plugins", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestFeatureGateAllowsEnabledRoute(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("tenant_id", "tenant-1")
		return c.Next()
	})
	app.Use(middleware.FeatureGate(stubFlags(map[string]bool{"marketplace_plugins": true})))
	app.Get("/api/v1/marketplace/plugins", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/marketplace/plugins", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]bool
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.True(t, body["ok"])
}
