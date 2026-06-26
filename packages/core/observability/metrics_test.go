package observability_test

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/observability"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetricsHandler(t *testing.T) {
	observability.Init("test", "ci")

	app := fiber.New()
	app.Get("/metrics", observability.MetricsHandler())
	app.Get("/ping", observability.RequestTiming(), func(c *fiber.Ctx) error {
		return c.SendString("pong")
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	_, err := app.Test(req)
	require.NoError(t, err)

	metricsReq := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	resp, err := app.Test(metricsReq)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Contains(t, string(body), "http_requests_total")
	assert.Contains(t, string(body), "fieldforge_build_info")
	assert.Contains(t, string(body), "http_requests_in_flight")
}

func TestInitExposesBuildInfo(t *testing.T) {
	observability.Init("1.2.3", "test")

	app := fiber.New()
	app.Get("/metrics", observability.MetricsHandler())

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/metrics", nil))
	require.NoError(t, err)
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Contains(t, string(body), `version="1.2.3"`)
	assert.Contains(t, string(body), `environment="test"`)
}

func TestRequestTimingRecordsStatus(t *testing.T) {
	app := fiber.New()
	app.Get("/ok", observability.RequestTiming(), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/ok", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}
