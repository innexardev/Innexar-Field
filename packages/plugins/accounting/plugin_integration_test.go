//go:build integration

package accounting_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/db"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/plugins/accounting"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestAccounting_ListEndpoints_TenantIsolation(t *testing.T) {
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
	seedAccountingData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newAccountingApp(pool, authSvc)

	endpoints := []struct {
		name string
		path string
	}{
		{name: "chart of accounts", path: "/accounting/chart"},
		{name: "accounts payable", path: "/accounting/ap"},
		{name: "accounts receivable", path: "/accounting/ar"},
		{name: "purchase orders", path: "/accounting/purchase-orders"},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			listA := getJSON(t, app, ep.path, tokenA)
			require.Equal(t, http.StatusOK, listA.StatusCode)
			defer listA.Body.Close()
			var bodyA struct {
				Data []map[string]any `json:"data"`
			}
			require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
			require.Len(t, bodyA.Data, 1, "tenant A should see its own row")

			listB := getJSON(t, app, ep.path, tokenB)
			require.Equal(t, http.StatusOK, listB.StatusCode)
			defer listB.Body.Close()
			var bodyB struct {
				Data []map[string]any `json:"data"`
			}
			require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
			assert.Empty(t, bodyB.Data, "tenant B must not see tenant A accounting data")
		})
	}
}

func seedAccountingData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	_, err := pool.Exec(seedCtx, `
		INSERT INTO chart_of_accounts (tenant_id, account_number, name, account_type, balance_cents)
		VALUES ($1, '1000', 'Cash', 'asset', 50000)
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO ap_bills (tenant_id, vendor_name, bill_number, amount_cents, status)
		VALUES ($1, 'Supply Co', 'BILL-001', 12500, 'open')
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO ar_aging (tenant_id, customer_name, invoice_number, amount_cents, days_outstanding, aging_bucket)
		VALUES ($1, 'Acme Corp', 'INV-100', 25000, 15, 'current')
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO purchase_orders (tenant_id, vendor_name, po_number, amount_cents, status)
		VALUES ($1, 'Parts Depot', 'PO-42', 9900, 'draft')
	`, tenantID)
	require.NoError(t, err)
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
	acctPlugin := accounting.New(pool.Pool)
	for _, m := range acctPlugin.Migrations() {
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

func newAccountingApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	_ = reg.Register(accounting.New(pool.Pool))
	reg.RegisterRoutes(protected, plugin.Deps{})
	return app
}

func getJSON(t *testing.T, app *fiber.App, path, token string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1"+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}
