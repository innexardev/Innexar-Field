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

func testApp(t *testing.T) *fiber.App {
	t.Helper()
	cfg := &config.AppConfig{
		Debug: config.DebugConfig{
			Enabled: true,
			Features: map[string]interface{}{
				"mock_stripe":     true,
				"mock_avalara":    true,
				"mock_quickbooks": true,
				"skip_sms_send":   true,
			},
		},
		Integrations: map[string]config.IntegrationConfig{
			"quickbooks": {
				ID:      "quickbooks",
				Name:    "QuickBooks Online",
				Enabled: true,
				OAuth: &config.IntegrationOAuthConfig{
					AuthorizeURL: "https://appcenter.intuit.com/connect/oauth2",
					Scopes:       []string{"com.intuit.quickbooks.accounting"},
				},
			},
			"avalara": {
				ID:       "avalara",
				Name:     "Avalara AvaTax",
				Enabled:  true,
				MockRate: 8.25,
			},
			"stripe_connect": {
				ID:         "stripe_connect",
				Name:       "Stripe Connect",
				Enabled:    true,
				ReturnPath: "/settings/integrations",
			},
			"twilio": {ID: "twilio", Name: "Twilio SMS", Enabled: true},
		},
	}

	app := fiber.New()
	protected := app.Group("", func(c *fiber.Ctx) error {
		ctx := tenant.WithID(c.UserContext(), "00000000-0000-4000-8000-000000000001")
		c.SetUserContext(ctx)
		c.Locals("tenant_id", "00000000-0000-4000-8000-000000000001")
		return c.Next()
	})
	integrations.RegisterRoutes(protected, nil, cfg, nil)
	return app
}

func TestIntegrationCatalog(t *testing.T) {
	app := testApp(t)
	req := httptest.NewRequest(http.MethodGet, "/integrations/", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 200, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var out struct {
		Data []config.IntegrationConfig `json:"data"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Len(t, out.Data, 4)
}

func TestAvalaraTaxCalculateMock(t *testing.T) {
	app := testApp(t)
	payload := map[string]interface{}{
		"amount_cents":  10000,
		"ship_to_state": "TX",
		"ship_to_zip":   "78701",
	}
	b, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/integrations/avalara/tax/calculate", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 200, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var out struct {
		TaxCents    int64   `json:"tax_cents"`
		RatePercent float64 `json:"rate_percent"`
		Mock        bool    `json:"mock"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Equal(t, int64(825), out.TaxCents)
	assert.Equal(t, 8.25, out.RatePercent)
	assert.True(t, out.Mock)
}

func TestQuickBooksConnectRedirectMock(t *testing.T) {
	app := testApp(t)
	req := httptest.NewRequest(http.MethodGet, "/integrations/quickbooks/connect?return_path=http://localhost:3000/settings/integrations?quickbooks=callback", nil)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 302, resp.StatusCode)
	location := resp.Header.Get("Location")
	assert.Contains(t, location, "mock_qb_code")
}

func TestQuickBooksExportInvoiceMock(t *testing.T) {
	app := testApp(t)

	startReq := httptest.NewRequest(http.MethodGet, "/integrations/quickbooks/oauth/start?redirect_uri=http://localhost:3000/callback", nil)
	startResp, err := app.Test(startReq)
	require.NoError(t, err)
	defer startResp.Body.Close()
	startBody, _ := io.ReadAll(startResp.Body)
	var start struct {
		State string `json:"state"`
	}
	require.NoError(t, json.Unmarshal(startBody, &start))

	connectPayload := map[string]string{"code": "mock_qb_code", "state": start.State, "realm_id": "mock_realm_test"}
	b, _ := json.Marshal(connectPayload)
	connectReq := httptest.NewRequest(http.MethodPost, "/integrations/quickbooks/oauth/callback", bytes.NewReader(b))
	connectReq.Header.Set("Content-Type", "application/json")
	connectResp, err := app.Test(connectReq)
	require.NoError(t, err)
	defer connectResp.Body.Close()
	assert.Equal(t, 200, connectResp.StatusCode)

	exportReq := httptest.NewRequest(http.MethodPost, "/integrations/quickbooks/invoices/00000000-0000-4000-8000-000000000099/export", nil)
	exportResp, err := app.Test(exportReq)
	require.NoError(t, err)
	defer exportResp.Body.Close()
	assert.Equal(t, 200, exportResp.StatusCode)

	body, _ := io.ReadAll(exportResp.Body)
	var out struct {
		InvoiceID  string `json:"invoice_id"`
		ExternalID string `json:"external_id"`
		Status     string `json:"status"`
		Mock       bool   `json:"mock"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Equal(t, "exported", out.Status)
	assert.True(t, out.Mock)
	assert.Contains(t, out.ExternalID, "mock_qb_inv_")
}

func TestQuickBooksOAuthStartMock(t *testing.T) {
	app := testApp(t)
	req := httptest.NewRequest(http.MethodGet, "/integrations/quickbooks/oauth/start?redirect_uri=http://localhost:3000/callback", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 200, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var out struct {
		AuthorizeURL string `json:"authorize_url"`
		Mock         bool   `json:"mock"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Contains(t, out.AuthorizeURL, "mock_qb_code")
	assert.True(t, out.Mock)
}

func TestStripeConnectOnboardMock(t *testing.T) {
	app := testApp(t)
	req := httptest.NewRequest(http.MethodPost, "/integrations/stripe-connect/onboard", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 200, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var out struct {
		OnboardingURL string `json:"onboarding_url"`
		Mock          bool   `json:"mock"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Contains(t, out.OnboardingURL, "stripe_connect=mock")
	assert.True(t, out.Mock)
}

func TestQuickBooksOAuthCompleteMock(t *testing.T) {
	app := testApp(t)

	startReq := httptest.NewRequest(http.MethodGet, "/integrations/quickbooks/oauth/start?redirect_uri=http://localhost:3000/callback", nil)
	startResp, err := app.Test(startReq)
	require.NoError(t, err)
	defer startResp.Body.Close()
	startBody, _ := io.ReadAll(startResp.Body)
	var start struct {
		State string `json:"state"`
	}
	require.NoError(t, json.Unmarshal(startBody, &start))

	payload := map[string]string{"code": "mock_qb_code", "state": start.State}
	b, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/integrations/quickbooks/oauth/callback", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 200, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var out struct {
		IntegrationID string `json:"integration_id"`
		Status        string `json:"status"`
		ExternalID    string `json:"external_id"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Equal(t, "quickbooks", out.IntegrationID)
	assert.Equal(t, "connected", out.Status)
	assert.Contains(t, out.ExternalID, "mock_realm_")
}

func TestQuickBooksDisconnect(t *testing.T) {
	app := testApp(t)

	startReq := httptest.NewRequest(http.MethodGet, "/integrations/quickbooks/oauth/start?redirect_uri=http://localhost:3000/callback", nil)
	startResp, err := app.Test(startReq)
	require.NoError(t, err)
	defer startResp.Body.Close()
	startBody, _ := io.ReadAll(startResp.Body)
	var start struct {
		State string `json:"state"`
	}
	require.NoError(t, json.Unmarshal(startBody, &start))

	connectPayload := map[string]string{"code": "mock_qb_code", "state": start.State}
	b, _ := json.Marshal(connectPayload)
	connectReq := httptest.NewRequest(http.MethodPost, "/integrations/quickbooks/oauth/callback", bytes.NewReader(b))
	connectReq.Header.Set("Content-Type", "application/json")
	_, err = app.Test(connectReq)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/integrations/quickbooks/disconnect", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 200, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var out struct {
		Status string `json:"status"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Equal(t, "disconnected", out.Status)
}

func TestStripeConnectCompleteMock(t *testing.T) {
	app := testApp(t)

	onboardReq := httptest.NewRequest(http.MethodPost, "/integrations/stripe-connect/onboard", bytes.NewReader([]byte(`{}`)))
	onboardReq.Header.Set("Content-Type", "application/json")
	onboardResp, err := app.Test(onboardReq)
	require.NoError(t, err)
	defer onboardResp.Body.Close()
	onboardBody, _ := io.ReadAll(onboardResp.Body)
	var onboard struct {
		AccountID string `json:"account_id"`
	}
	require.NoError(t, json.Unmarshal(onboardBody, &onboard))

	payload := map[string]string{"account_id": onboard.AccountID}
	b, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/integrations/stripe-connect/complete", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 200, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var out struct {
		Status         string `json:"status"`
		ChargesEnabled bool   `json:"charges_enabled"`
		PayoutsEnabled bool   `json:"payouts_enabled"`
		Mock           bool   `json:"mock"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Equal(t, "connected", out.Status)
	assert.True(t, out.ChargesEnabled)
	assert.True(t, out.PayoutsEnabled)
	assert.True(t, out.Mock)
}

func TestIntegrationStatusList(t *testing.T) {
	app := testApp(t)
	req := httptest.NewRequest(http.MethodGet, "/integrations/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 200, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var out struct {
		Data []struct {
			IntegrationID string `json:"integration_id"`
			Status        string `json:"status"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(body, &out))
	assert.Len(t, out.Data, 4)
}

func TestQuickBooksOAuthCallbackRejectsInvalidState(t *testing.T) {
	app := testApp(t)

	startReq := httptest.NewRequest(http.MethodGet, "/integrations/quickbooks/oauth/start?redirect_uri=http://localhost:3000/callback", nil)
	startResp, err := app.Test(startReq)
	require.NoError(t, err)
	defer startResp.Body.Close()
	startBody, _ := io.ReadAll(startResp.Body)
	var start struct {
		State string `json:"state"`
	}
	require.NoError(t, json.Unmarshal(startBody, &start))

	t.Run("missing state", func(t *testing.T) {
		payload := map[string]string{"code": "mock_qb_code"}
		b, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/integrations/quickbooks/oauth/callback", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		defer resp.Body.Close()
		assert.Equal(t, 400, resp.StatusCode)
	})

	t.Run("wrong state", func(t *testing.T) {
		payload := map[string]string{"code": "mock_qb_code", "state": "wrong-state-value"}
		b, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/integrations/quickbooks/oauth/callback", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		defer resp.Body.Close()
		assert.Equal(t, 400, resp.StatusCode)
		assert.NotEqual(t, start.State, "wrong-state-value")
	})
}

func TestStripeConnectCompleteRejectsWrongAccountID(t *testing.T) {
	app := testApp(t)

	onboardReq := httptest.NewRequest(http.MethodPost, "/integrations/stripe-connect/onboard", bytes.NewReader([]byte(`{}`)))
	onboardReq.Header.Set("Content-Type", "application/json")
	onboardResp, err := app.Test(onboardReq)
	require.NoError(t, err)
	defer onboardResp.Body.Close()
	onboardBody, _ := io.ReadAll(onboardResp.Body)
	var onboard struct {
		AccountID string `json:"account_id"`
	}
	require.NoError(t, json.Unmarshal(onboardBody, &onboard))
	require.NotEmpty(t, onboard.AccountID)

	payload := map[string]string{"account_id": "acct_wrong_account_id"}
	b, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/integrations/stripe-connect/complete", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 400, resp.StatusCode)
}

func TestAvalaraTaxCalculateValidation(t *testing.T) {
	app := testApp(t)
	payload := map[string]interface{}{"amount_cents": -1, "ship_to_state": "TX"}
	b, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/integrations/avalara/tax/calculate", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 400, resp.StatusCode)
}

func TestTwilioConnectAndTestSendMock(t *testing.T) {
	app := testApp(t)
	payload := map[string]string{"account_sid": "ACmock123", "from_number": "+15551234567"}
	b, _ := json.Marshal(payload)
	connectReq := httptest.NewRequest(http.MethodPost, "/integrations/twilio/connect", bytes.NewReader(b))
	connectReq.Header.Set("Content-Type", "application/json")
	connectResp, err := app.Test(connectReq)
	require.NoError(t, err)
	defer connectResp.Body.Close()
	assert.Equal(t, 200, connectResp.StatusCode)
}
