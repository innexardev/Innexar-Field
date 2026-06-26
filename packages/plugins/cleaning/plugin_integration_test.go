//go:build integration

package cleaning_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/db"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/plugins/cleaning"
	"github.com/fieldforge/fieldforge/packages/plugins/scheduling"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestCleaning_ListEndpoints_TenantIsolation(t *testing.T) {
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
	jobID := seedCleaningData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newCleaningApp(pool, authSvc)

	t.Run("recurring cleans", func(t *testing.T) {
		assertListIsolation(t, app, "/cleaning/recurring-cleans", tokenA, tokenB)
	})

	t.Run("clean phases", func(t *testing.T) {
		assertListIsolation(t, app, "/cleaning/clean-phases", tokenA, tokenB)
	})

	t.Run("today cleans", func(t *testing.T) {
		assertListIsolation(t, app, "/cleaning/jobs", tokenA, tokenB)
	})

	t.Run("get job by id", func(t *testing.T) {
		getA := getJSON(t, app, "/cleaning/jobs/"+jobID, tokenA)
		require.Equal(t, http.StatusOK, getA.StatusCode)
		_ = getA.Body.Close()

		getB := getJSON(t, app, "/cleaning/jobs/"+jobID, tokenB)
		assert.Equal(t, http.StatusNotFound, getB.StatusCode)
		_ = getB.Body.Close()
	})
}

func assertListIsolation(t *testing.T, app *fiber.App, path, tokenA, tokenB string) {
	t.Helper()
	listA := getJSON(t, app, path, tokenA)
	require.Equal(t, http.StatusOK, listA.StatusCode)
	defer listA.Body.Close()
	var bodyA struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
	require.Len(t, bodyA.Data, 1, "tenant A should see its own row")

	listB := getJSON(t, app, path, tokenB)
	require.Equal(t, http.StatusOK, listB.StatusCode)
	defer listB.Body.Close()
	var bodyB struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
	assert.Empty(t, bodyB.Data, "tenant B must not see tenant A cleaning data")
}

func seedCleaningData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) string {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	now := time.Now().UTC()
	scheduledAt := time.Date(now.Year(), now.Month(), now.Day(), 10, 0, 0, 0, time.UTC)

	var jobID string
	err := pool.QueryRow(seedCtx, `
		INSERT INTO jobs (tenant_id, title, status, scheduled_at)
		VALUES ($1, 'Office deep clean', 'scheduled', $2)
		RETURNING id::text
	`, tenantID, scheduledAt).Scan(&jobID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO recurring_cleans (tenant_id, title, frequency, phase)
		VALUES ($1, 'Weekly office clean', 'weekly', 'final')
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO clean_phases (tenant_id, job_id, phase, status)
		VALUES ($1, $2, 'final', 'pending')
	`, tenantID, jobID)
	require.NoError(t, err)

	return jobID
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
	schedPlugin := scheduling.New(pool.Pool, nil)
	for _, m := range schedPlugin.Migrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	cleanPlugin := cleaning.New(pool.Pool)
	for _, m := range cleanPlugin.Migrations() {
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

func newCleaningApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	_ = reg.Register(cleaning.New(pool.Pool))
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
