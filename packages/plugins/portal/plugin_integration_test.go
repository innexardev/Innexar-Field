//go:build integration

package portal_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/db"
	"github.com/fieldforge/fieldforge/packages/core/events"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/plugins/crm"
	"github.com/fieldforge/fieldforge/packages/plugins/invoicing"
	"github.com/fieldforge/fieldforge/packages/plugins/portal"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestPortal_CustomerAuthAndInvoices_TenantIsolation(t *testing.T) {
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
	customerA := uuid.New().String()
	customerB := uuid.New().String()
	invoiceA := uuid.New().String()
	invoiceB := uuid.New().String()

	seedTenant(t, ctx, pool, tenantA, "acme-a")
	seedTenant(t, ctx, pool, tenantB, "acme-b")
	seedCustomer(t, ctx, pool, tenantA, customerA, "Alice", "alice@example.com")
	seedCustomer(t, ctx, pool, tenantB, customerB, "Bob", "bob@example.com")
	seedInvoice(t, ctx, pool, tenantA, invoiceA, customerA, "INV-A1", "sent", 10000)
	seedInvoice(t, ctx, pool, tenantB, invoiceB, customerB, "INV-B1", "sent", 20000)
	seedDraftInvoice(t, ctx, pool, tenantA, uuid.New().String(), customerA, "INV-DRAFT", 5000)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	appCfg := &config.AppConfig{
		Debug: config.DebugConfig{
			Enabled: true,
			Features: map[string]interface{}{
				"skip_email_send": true,
				"mock_stripe":     true,
			},
		},
	}
	portalPlugin := portal.New(pool.Pool, authSvc, appCfg, events.NewBus(pool.Pool))
	app := newPortalApp(pool, authSvc, portalPlugin)

	t.Run("magic link and verify", func(t *testing.T) {
		res := postJSON(t, app, "/public/portal/login", map[string]string{
			"email":       "alice@example.com",
			"tenant_slug": "acme-a",
		}, "")
		require.Equal(t, http.StatusOK, res.StatusCode)
		defer res.Body.Close()

		var body map[string]string
		require.NoError(t, json.NewDecoder(res.Body).Decode(&body))
		require.NotEmpty(t, body["dev_token"])

		verifyRes := postJSON(t, app, "/public/portal/verify", map[string]string{
			"token": body["dev_token"],
		}, "")
		require.Equal(t, http.StatusOK, verifyRes.StatusCode)
		defer verifyRes.Body.Close()

		var session struct {
			Token string `json:"token"`
		}
		require.NoError(t, json.NewDecoder(verifyRes.Body).Decode(&session))
		require.NotEmpty(t, session.Token)

		listRes := getJSON(t, app, "/portal/invoices", session.Token)
		require.Equal(t, http.StatusOK, listRes.StatusCode)
		defer listRes.Body.Close()

		var invoices struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listRes.Body).Decode(&invoices))
		require.Len(t, invoices.Data, 1)
		assert.Equal(t, "INV-A1", invoices.Data[0]["invoice_number"])
	})

	t.Run("customer cannot see other tenant invoices", func(t *testing.T) {
		token, err := authSvc.IssueCustomerToken(customerB, tenantB, "bob@example.com")
		require.NoError(t, err)

		listRes := getJSON(t, app, "/portal/invoices", token)
		require.Equal(t, http.StatusOK, listRes.StatusCode)
		defer listRes.Body.Close()

		var invoices struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listRes.Body).Decode(&invoices))
		require.Len(t, invoices.Data, 1)
		assert.Equal(t, "INV-B1", invoices.Data[0]["invoice_number"])

		getRes := getJSON(t, app, "/portal/invoices/"+invoiceA, token)
		require.Equal(t, http.StatusNotFound, getRes.StatusCode)
		getRes.Body.Close()
	})

	t.Run("staff token rejected on portal routes", func(t *testing.T) {
		staffToken, err := authSvc.IssueToken(uuid.New().String(), tenantA, "staff@example.com", "owner")
		require.NoError(t, err)

		res := getJSON(t, app, "/portal/invoices", staffToken)
		require.Equal(t, http.StatusForbidden, res.StatusCode)
		res.Body.Close()
	})

	t.Run("payments documents profile", func(t *testing.T) {
		token, err := authSvc.IssueCustomerToken(customerA, tenantA, "alice@example.com")
		require.NoError(t, err)

		payRes := getJSON(t, app, "/portal/payments", token)
		require.Equal(t, http.StatusOK, payRes.StatusCode)
		defer payRes.Body.Close()
		var payments struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(payRes.Body).Decode(&payments))
		require.Len(t, payments.Data, 1)

		intentRes := postJSON(t, app, "/portal/invoices/"+invoiceA+"/payment-intent", map[string]string{}, token)
		require.Equal(t, http.StatusOK, intentRes.StatusCode)
		intentRes.Body.Close()

		confirmRes := postJSON(t, app, "/portal/invoices/"+invoiceA+"/confirm-payment", map[string]string{}, token)
		require.Equal(t, http.StatusOK, confirmRes.StatusCode)
		confirmRes.Body.Close()

		docsRes := getJSON(t, app, "/portal/documents", token)
		require.Equal(t, http.StatusOK, docsRes.StatusCode)
		docsRes.Body.Close()

		patchRes := patchJSON(t, app, "/portal/me", map[string]string{"phone": "555-0100"}, token)
		require.Equal(t, http.StatusOK, patchRes.StatusCode)
		defer patchRes.Body.Close()
		var profile map[string]any
		require.NoError(t, json.NewDecoder(patchRes.Body).Decode(&profile))
		assert.Equal(t, "555-0100", profile["phone"])
	})
}

func newPortalApp(pool *db.Pool, authSvc *auth.Service, portalPlugin *portal.Plugin) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	publicRL := func(c *fiber.Ctx) error { return c.Next() }
	portalPlugin.RegisterPublicRoutes(api.Group("/public"), publicRL)

	protected := api.Group("",
		ffmiddleware.CustomerAuth(authSvc),
	)
	portalPlugin.RegisterCustomerRoutes(protected)
	return app
}

func runMigrations(ctx context.Context, pool *db.Pool) error {
	reg := plugin.NewRegistry()
	_ = reg.Register(crm.New(pool.Pool))
	bus := events.NewBus(pool.Pool)
	_ = reg.Register(invoicing.New(pool.Pool, bus))
	_ = reg.Register(portal.New(pool.Pool, auth.NewService("x", 1), &config.AppConfig{}, bus))

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
	for _, m := range reg.AllMigrations() {
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
		VALUES ($1, $2, $3, 'cleaning', 'starter')
	`, tenantID, slug, slug)
	require.NoError(t, err)
}

func seedCustomer(t *testing.T, ctx context.Context, pool *db.Pool, tenantID, customerID, name, email string) {
	t.Helper()
	tctx := tenant.WithID(ctx, tenantID)
	_, err := pool.Exec(tctx, `
		INSERT INTO customers (id, tenant_id, name, email)
		VALUES ($1, $2, $3, $4)
	`, customerID, tenantID, name, email)
	require.NoError(t, err)
}

func seedInvoice(t *testing.T, ctx context.Context, pool *db.Pool, tenantID, invoiceID, customerID, number, status string, total int64) {
	t.Helper()
	tctx := tenant.WithID(ctx, tenantID)
	_, err := pool.Exec(tctx, `
		INSERT INTO invoices (id, tenant_id, customer_id, invoice_number, status, total_cents, due_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, invoiceID, tenantID, customerID, number, status, total, time.Now().UTC().Add(24*time.Hour))
	require.NoError(t, err)
}

func seedDraftInvoice(t *testing.T, ctx context.Context, pool *db.Pool, tenantID, invoiceID, customerID, number string, total int64) {
	t.Helper()
	tctx := tenant.WithID(ctx, tenantID)
	_, err := pool.Exec(tctx, `
		INSERT INTO invoices (id, tenant_id, customer_id, invoice_number, status, total_cents)
		VALUES ($1, $2, $3, $4, 'draft', $5)
	`, invoiceID, tenantID, customerID, number, total)
	require.NoError(t, err)
}

func patchJSON(t *testing.T, app *fiber.App, path string, body any, token string) *http.Response {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1"+path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := app.Test(req, -1)
	require.NoError(t, err)
	return res
}

func postJSON(t *testing.T, app *fiber.App, path string, body any, token string) *http.Response {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1"+path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := app.Test(req, -1)
	require.NoError(t, err)
	return res
}

func getJSON(t *testing.T, app *fiber.App, path, token string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1"+path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := app.Test(req, -1)
	require.NoError(t, err)
	return res
}
