//go:build integration

package estimating_test

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
	"github.com/fieldforge/fieldforge/packages/plugins/estimating"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestEstimating_ListEndpoints_TenantIsolation(t *testing.T) {
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
	seedEstimatingData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newEstimatingApp(pool, authSvc)

	endpoints := []struct {
		name string
		path string
	}{
		{name: "estimates", path: "/estimating/estimates"},
		{name: "price book", path: "/estimating/price-book"},
		{name: "takeoff", path: "/estimating/takeoff"},
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
			assert.Empty(t, bodyB.Data, "tenant B must not see tenant A estimating data")
		})
	}
}

func seedEstimatingData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	_, err := pool.Exec(seedCtx, `
		INSERT INTO estimates (tenant_id, title, status, subtotal_cents, total_cents)
		VALUES ($1, 'Kitchen remodel', 'draft', 150000, 150000)
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO price_book_items (tenant_id, name, category, unit, unit_price_cents)
		VALUES ($1, 'Standard cleaning', 'service', 'hour', 4500)
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO takeoff_measurements (tenant_id, label, total_sqft, rooms)
		VALUES ($1, 'Main floor', 1200.00, '[]')
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
	bus := events.NewBus(pool.Pool)
	estPlugin := estimating.New(pool.Pool, bus)
	for _, m := range estPlugin.Migrations() {
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

func newEstimatingApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	bus := events.NewBus(pool.Pool)
	_ = reg.Register(estimating.New(pool.Pool, bus))
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
