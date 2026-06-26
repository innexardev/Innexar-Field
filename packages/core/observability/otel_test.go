package observability_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/observability"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTracingPropagatesIncomingTraceparent(t *testing.T) {
	app := fiber.New()
	app.Use(observability.Tracing())
	app.Get("/ping", func(c *fiber.Ctx) error {
		return c.SendString(observability.TraceIDFromContext(c))
	})

	incoming := "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("traceparent", incoming)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, incoming, resp.Header.Get("traceparent"))
}

func TestTracingGeneratesTraceparentWhenMissing(t *testing.T) {
	app := fiber.New()
	app.Use(observability.Tracing())
	app.Get("/ping", func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.Header.Get("traceparent"))
}
