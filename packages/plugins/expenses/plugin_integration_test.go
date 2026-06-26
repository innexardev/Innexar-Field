//go:build integration

package expenses_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/db"
	"github.com/fieldforge/fieldforge/packages/core/events"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/plugins/expenses"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestExpenses_ListEndpoints_TenantIsolation(t *testing.T) {
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
	expenseID := seedExpenseData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newExpensesApp(pool, authSvc)

	t.Run("list", func(t *testing.T) {
		listA := getJSON(t, app, "/expenses/expenses", tokenA)
		require.Equal(t, http.StatusOK, listA.StatusCode)
		defer listA.Body.Close()
		var bodyA struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
		require.Len(t, bodyA.Data, 1, "tenant A should see its own expense")

		listB := getJSON(t, app, "/expenses/expenses", tokenB)
		require.Equal(t, http.StatusOK, listB.StatusCode)
		defer listB.Body.Close()
		var bodyB struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
		assert.Empty(t, bodyB.Data, "tenant B must not see tenant A expenses")
	})

	t.Run("get by id", func(t *testing.T) {
		getA := getJSON(t, app, "/expenses/expenses/"+expenseID, tokenA)
		require.Equal(t, http.StatusOK, getA.StatusCode)
		_ = getA.Body.Close()

		getB := getJSON(t, app, "/expenses/expenses/"+expenseID, tokenB)
		assert.Equal(t, http.StatusNotFound, getB.StatusCode)
		_ = getB.Body.Close()
	})
}

func seedExpenseData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) string {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	var expenseID string
	err := pool.QueryRow(seedCtx, `
		INSERT INTO expenses (tenant_id, description, amount_cents, category, status, expense_date)
		VALUES ($1, 'Fuel reimbursement', 4500, 'travel', 'pending', '2026-06-01')
		RETURNING id::text
	`, tenantID).Scan(&expenseID)
	require.NoError(t, err)
	return expenseID
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
	bus := events.NewBus(pool.Pool)
	expPlugin := expenses.New(pool.Pool, bus)
	for _, m := range expPlugin.Migrations() {
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

func newExpensesApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	bus := events.NewBus(pool.Pool)
	_ = reg.Register(expenses.New(pool.Pool, bus))
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
