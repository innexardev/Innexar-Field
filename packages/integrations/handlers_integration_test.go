//go:build integration

package integrations_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/db"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/integrations"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestIntegrations_Status_TenantIsolation(t *testing.T) {
	ctx := context.Background()

	pg, err := tcpostgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:16-alpine"),
		tcpostgres.WithDatabase("fieldforge"),
		tcpostgres.WithUsername("fieldforge"),
		tcpostgres.WithPassword("fieldforge"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").WithOccurrence(2),
		),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = pg.Terminate(ctx) })

	connStr, err := pg.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	pool, err := db.Connect(ctx, connStr)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	require.NoError(t, runMigrations(ctx, pool))

	tenantA := uuid.New().String()
	tenantB := uuid.New().String()
	seedTenant(t, ctx, pool, tenantA, "tenant-a")
	seedTenant(t, ctx, pool, tenantB, "tenant-b")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newIntegrationsApp(pool, authSvc)

	startRes := getJSON(t, app, "/integrations/quickbooks/oauth/start?redirect_uri=http://localhost:3000/callback", tokenA)
	require.Equal(t, http.StatusOK, startRes.StatusCode)
	defer startRes.Body.Close()
	var startBody struct {
		State string `json:"state"`
	}
	require.NoError(t, json.NewDecoder(startRes.Body).Decode(&startBody))
	require.NotEmpty(t, startBody.State)

	connectRes := postJSON(t, app, "/integrations/quickbooks/oauth/callback", tokenA, map[string]string{
		"code":  "mock_qb_code",
		"state": startBody.State,
	})
	require.Equal(t, http.StatusOK, connectRes.StatusCode)
	defer connectRes.Body.Close()

	var connected map[string]any
	require.NoError(t, json.NewDecoder(connectRes.Body).Decode(&connected))
	assert.Equal(t, "connected", connected["status"])
	externalID, _ := connected["external_id"].(string)
	require.NotEmpty(t, externalID)

	statusA := getJSON(t, app, "/integrations/status", tokenA)
	require.Equal(t, http.StatusOK, statusA.StatusCode)
	defer statusA.Body.Close()
	var bodyA struct {
		Data []struct {
			IntegrationID string `json:"integration_id"`
			Status        string `json:"status"`
			ExternalID    string `json:"external_id"`
		} `json:"data"`
	}
	require.NoError(t, json.NewDecoder(statusA.Body).Decode(&bodyA))
	require.NotEmpty(t, bodyA.Data)

	var qbA *struct {
		IntegrationID string `json:"integration_id"`
		Status        string `json:"status"`
		ExternalID    string `json:"external_id"`
	}
	for i := range bodyA.Data {
		if bodyA.Data[i].IntegrationID == integrations.IDQuickBooks {
			qbA = &bodyA.Data[i]
			break
		}
	}
	require.NotNil(t, qbA, "quickbooks status for tenant A")
	assert.Equal(t, "connected", qbA.Status)
	assert.Equal(t, externalID, qbA.ExternalID)

	statusB := getJSON(t, app, "/integrations/status", tokenB)
	require.Equal(t, http.StatusOK, statusB.StatusCode)
	defer statusB.Body.Close()
	var bodyB struct {
		Data []struct {
			IntegrationID string `json:"integration_id"`
			Status        string `json:"status"`
			ExternalID    string `json:"external_id"`
		} `json:"data"`
	}
	require.NoError(t, json.NewDecoder(statusB.Body).Decode(&bodyB))
	require.NotEmpty(t, bodyB.Data)

	var qbB *struct {
		IntegrationID string `json:"integration_id"`
		Status        string `json:"status"`
		ExternalID    string `json:"external_id"`
	}
	for i := range bodyB.Data {
		if bodyB.Data[i].IntegrationID == integrations.IDQuickBooks {
			qbB = &bodyB.Data[i]
			break
		}
	}
	require.NotNil(t, qbB, "quickbooks status for tenant B")
	assert.Equal(t, "disconnected", qbB.Status)
	assert.Empty(t, qbB.ExternalID, "tenant B must not see tenant A integration credentials")
}

func runMigrations(ctx context.Context, pool *db.Pool) error {
	var all []struct {
		Version int
		Name    string
		UpSQL   string
	}
	for _, m := range coremigrate.Core {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	return pool.RunMigrations(ctx, all)
}

func seedTenant(t *testing.T, ctx context.Context, pool *db.Pool, tenantID, slug string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO tenants (id, slug, name, industry_pack, plan_id)
		VALUES ($1, $2, $3, 'field-services', 'starter')
	`, tenantID, slug, slug)
	require.NoError(t, err)
}

func integrationTestConfig() *config.AppConfig {
	return &config.AppConfig{
		Debug: config.DebugConfig{
			Enabled: true,
			Features: map[string]interface{}{
				"mock_stripe":     true,
				"mock_avalara":    true,
				"mock_quickbooks": true,
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
		},
	}
}

func newIntegrationsApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	integrations.RegisterRoutes(protected, pool.Pool, integrationTestConfig())
	return app
}

func postJSON(t *testing.T, app *fiber.App, path, token string, body any) *http.Response {
	t.Helper()
	payload, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1"+path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req = req.WithContext(tenant.WithID(req.Context(), ""))
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}

func getJSON(t *testing.T, app *fiber.App, path, token string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1"+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}
