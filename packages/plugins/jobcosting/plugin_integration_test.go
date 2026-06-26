//go:build integration

package jobcosting_test

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
	"github.com/fieldforge/fieldforge/packages/plugins/jobcosting"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestJobCosting_ListEndpoints_TenantIsolation(t *testing.T) {
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
	jobID, costLineID := seedJobCostingData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newJobCostingApp(pool, authSvc)

	t.Run("list job costs", func(t *testing.T) {
		listA := getJSON(t, app, "/job-costing/job-costs", tokenA)
		require.Equal(t, http.StatusOK, listA.StatusCode)
		defer listA.Body.Close()
		var bodyA struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
		require.Len(t, bodyA.Data, 1, "tenant A should see its own cost line")

		listB := getJSON(t, app, "/job-costing/job-costs", tokenB)
		require.Equal(t, http.StatusOK, listB.StatusCode)
		defer listB.Body.Close()
		var bodyB struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
		assert.Empty(t, bodyB.Data, "tenant B must not see tenant A job cost lines")
	})

	t.Run("get by id", func(t *testing.T) {
		getA := getJSON(t, app, "/job-costing/job-costs/"+costLineID, tokenA)
		require.Equal(t, http.StatusOK, getA.StatusCode)
		_ = getA.Body.Close()

		getB := getJSON(t, app, "/job-costing/job-costs/"+costLineID, tokenB)
		assert.Equal(t, http.StatusNotFound, getB.StatusCode)
		_ = getB.Body.Close()
	})

	t.Run("job summary", func(t *testing.T) {
		summaryA := getJSON(t, app, "/job-costing/jobs/"+jobID+"/summary", tokenA)
		require.Equal(t, http.StatusOK, summaryA.StatusCode)
		defer summaryA.Body.Close()
		var bodyA struct {
			LineCount int `json:"line_count"`
		}
		require.NoError(t, json.NewDecoder(summaryA.Body).Decode(&bodyA))
		assert.Equal(t, 1, bodyA.LineCount, "tenant A should see its own cost summary")

		summaryB := getJSON(t, app, "/job-costing/jobs/"+jobID+"/summary", tokenB)
		require.Equal(t, http.StatusOK, summaryB.StatusCode)
		defer summaryB.Body.Close()
		var bodyB struct {
			LineCount int `json:"line_count"`
		}
		require.NoError(t, json.NewDecoder(summaryB.Body).Decode(&bodyB))
		assert.Equal(t, 0, bodyB.LineCount, "tenant B must not see tenant A job cost summary")
	})
}

func seedJobCostingData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) (jobID, costLineID string) {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	jobID = uuid.New().String()
	err := pool.QueryRow(seedCtx, `
		INSERT INTO job_cost_lines (tenant_id, job_id, cost_code, description, budget_cents, actual_cents)
		VALUES ($1, $2::uuid, 'labor', 'Crew hours', 50000, 42000)
		RETURNING id::text
	`, tenantID, jobID).Scan(&costLineID)
	require.NoError(t, err)
	return jobID, costLineID
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
	jcPlugin := jobcosting.New(pool.Pool)
	for _, m := range jcPlugin.Migrations() {
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

func newJobCostingApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	_ = reg.Register(jobcosting.New(pool.Pool))
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
