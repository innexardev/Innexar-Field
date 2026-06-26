//go:build integration

package construction_test

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
	"github.com/fieldforge/fieldforge/packages/plugins/construction"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestConstruction_ListEndpoints_TenantIsolation(t *testing.T) {
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
	projectID := seedConstructionData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newConstructionApp(pool, authSvc)

	endpoints := []struct {
		name string
		path string
	}{
		{name: "projects", path: "/construction/projects"},
		{name: "subcontractors", path: "/construction/subcontractors"},
		{name: "change orders", path: "/construction/change-orders"},
		{name: "milestones", path: "/construction/milestones"},
		{name: "permits", path: "/construction/permits"},
		{name: "lien waivers", path: "/construction/lien-waivers"},
		{name: "rfis", path: "/construction/rfis"},
		{name: "daily logs", path: "/construction/projects/" + projectID + "/daily-logs"},
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
			assert.Empty(t, bodyB.Data, "tenant B must not see tenant A construction data")
		})
	}
}

func seedConstructionData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) string {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	var projectID string
	err := pool.QueryRow(seedCtx, `
		INSERT INTO projects (tenant_id, name, budget_cents)
		VALUES ($1, 'Office build-out', 500000)
		RETURNING id::text
	`, tenantID).Scan(&projectID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO subcontractors (tenant_id, company_name, trade)
		VALUES ($1, 'Ace Electric', 'electrical')
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO change_orders (tenant_id, project_id, title, amount_cents)
		VALUES ($1, $2, 'Add skylight', 12000)
	`, tenantID, projectID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO project_milestones (tenant_id, project_id, name, amount_cents)
		VALUES ($1, $2, 'Foundation complete', 100000)
	`, tenantID, projectID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO project_daily_logs (tenant_id, project_id, weather, crew_count, notes)
		VALUES ($1, $2, 'sunny', 8, 'Framing progress')
	`, tenantID, projectID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO permits (tenant_id, project_id, permit_type, jurisdiction)
		VALUES ($1, $2, 'building', 'City of Austin')
	`, tenantID, projectID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO lien_waivers (tenant_id, project_id, party_name, amount_cents)
		VALUES ($1, $2, 'Ace Electric', 25000)
	`, tenantID, projectID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO rfis (tenant_id, project_id, subject, question)
		VALUES ($1, $2, 'Beam sizing', 'Confirm W12x26 spec')
	`, tenantID, projectID)
	require.NoError(t, err)

	return projectID
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
	conPlugin := construction.New(pool.Pool, bus)
	for _, m := range conPlugin.Migrations() {
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
		VALUES ($1, $2, $3, 'construction', 'starter')
	`, tenantID, slug, slug)
	require.NoError(t, err)
}

func newConstructionApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	bus := events.NewBus(pool.Pool)
	_ = reg.Register(construction.New(pool.Pool, bus))
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
