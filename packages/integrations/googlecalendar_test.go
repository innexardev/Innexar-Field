package integrations_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/integrations"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testAppWithGoogleCalendar(t *testing.T) *fiber.App {
	t.Helper()
	cfg := &config.AppConfig{
		Debug: config.DebugConfig{
			Enabled: true,
			Features: map[string]interface{}{
				"mock_google_calendar": true,
			},
		},
		Integrations: map[string]config.IntegrationConfig{
			"google_calendar": {
				ID:      "google_calendar",
				Name:    "Google Calendar",
				Enabled: true,
				OAuth: &config.IntegrationOAuthConfig{
					AuthorizeURL: "https://accounts.google.com/o/oauth2/v2/auth",
					Scopes:       []string{"https://www.googleapis.com/auth/calendar.events"},
				},
			},
		},
	}

	app := fiber.New()
	protected := app.Group("", func(c *fiber.Ctx) error {
		ctx := tenant.WithID(c.UserContext(), "00000000-0000-4000-8000-000000000002")
		c.SetUserContext(ctx)
		c.Locals("tenant_id", "00000000-0000-4000-8000-000000000002")
		return c.Next()
	})
	integrations.RegisterRoutes(protected, nil, cfg, nil)
	return app
}

func TestGoogleCalendarOAuthMockFlow(t *testing.T) {
	app := testAppWithGoogleCalendar(t)

	startReq := httptest.NewRequest(http.MethodGet, "/integrations/google-calendar/oauth/start", nil)
	startResp, err := app.Test(startReq)
	require.NoError(t, err)
	defer startResp.Body.Close()
	assert.Equal(t, 200, startResp.StatusCode)

	startBody, _ := io.ReadAll(startResp.Body)
	var start integrations.GoogleCalendarOAuthStart
	require.NoError(t, json.Unmarshal(startBody, &start))
	assert.True(t, start.Mock)
	assert.NotEmpty(t, start.State)

	payload := map[string]string{"code": "mock_gc_code", "state": start.State}
	b, _ := json.Marshal(payload)
	cbReq := httptest.NewRequest(http.MethodPost, "/integrations/google-calendar/oauth/callback", bytes.NewReader(b))
	cbReq.Header.Set("Content-Type", "application/json")
	cbResp, err := app.Test(cbReq)
	require.NoError(t, err)
	defer cbResp.Body.Close()
	assert.Equal(t, 200, cbResp.StatusCode)

	cbBody, _ := io.ReadAll(cbResp.Body)
	var st integrations.ConnectionStatus
	require.NoError(t, json.Unmarshal(cbBody, &st))
	assert.Equal(t, "google_calendar", st.IntegrationID)
	assert.Equal(t, "connected", st.Status)
}
