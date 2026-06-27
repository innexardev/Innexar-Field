//go:build integration

package platform_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/db"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	"github.com/fieldforge/fieldforge/packages/core/platform"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestPlatform_TenantCannotAccessPlans(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startPostgres(t, ctx)
	defer cleanup()

	tenantID := uuid.New().String()
	seedTenant(t, ctx, pool, tenantID, "acme")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tenantToken, err := authSvc.IssueToken(uuid.New().String(), tenantID, "owner@acme.com", "owner")
	require.NoError(t, err)

	app := newPlatformApp(pool, authSvc)

	res := getWithToken(t, app, "/platform/plans", tenantToken)
	assert.Equal(t, http.StatusForbidden, res.StatusCode)
	_ = res.Body.Close()
}

func TestPlatform_AdminCRUDPlans(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startPostgres(t, ctx)
	defer cleanup()

	adminID := seedPlatformAdmin(t, ctx, pool, "admin@platform.com", "secret123")
	_ = adminID

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	adminToken, err := authSvc.IssuePlatformToken(adminID, "admin@platform.com")
	require.NoError(t, err)

	app := newPlatformApp(pool, authSvc)

	const planID = "integration_test_plan"
	createRes := postWithToken(t, app, "/platform/plans", adminToken, map[string]any{
		"id":   planID,
		"name": "Integration Test Plan",
	})
	require.Equal(t, http.StatusCreated, createRes.StatusCode)
	defer createRes.Body.Close()

	listRes := getWithToken(t, app, "/platform/plans", adminToken)
	require.Equal(t, http.StatusOK, listRes.StatusCode)
	defer listRes.Body.Close()

	var listBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listRes.Body).Decode(&listBody))
	require.GreaterOrEqual(t, len(listBody.Data), 1)
	var found bool
	for _, row := range listBody.Data {
		if row["id"] == planID {
			found = true
			break
		}
	}
	require.True(t, found, "created plan should appear in list")

	patchRes := patchWithToken(t, app, "/platform/plans/"+planID, adminToken, map[string]any{
		"name": "Integration Test Plan Plus",
	})
	require.Equal(t, http.StatusOK, patchRes.StatusCode)
	_ = patchRes.Body.Close()

	delRes := deleteWithToken(t, app, "/platform/plans/"+planID, adminToken)
	assert.Equal(t, http.StatusNoContent, delRes.StatusCode)
	_ = delRes.Body.Close()
}

func TestPlatform_BillingSettings(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startPostgres(t, ctx)
	defer cleanup()

	adminID := seedPlatformAdmin(t, ctx, pool, "admin@platform.com", "secret123")
	_ = adminID

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	adminToken, err := authSvc.IssuePlatformToken(adminID, "admin@platform.com")
	require.NoError(t, err)

	app := newPlatformApp(pool, authSvc)

	getRes := getWithToken(t, app, "/platform/billing-settings", adminToken)
	require.Equal(t, http.StatusOK, getRes.StatusCode)
	defer getRes.Body.Close()

	patchRes := patchWithToken(t, app, "/platform/billing-settings", adminToken, map[string]any{
		"trial_days":      0,
		"default_plan_id": "starter",
	})
	require.Equal(t, http.StatusOK, patchRes.StatusCode)
	defer patchRes.Body.Close()

	var body map[string]any
	require.NoError(t, json.NewDecoder(patchRes.Body).Decode(&body))
	assert.Equal(t, float64(0), body["trial_days"])
	assert.Equal(t, "starter", body["default_plan_id"])
}

func TestPlatform_LoginAndStats(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startPostgres(t, ctx)
	defer cleanup()

	seedPlatformAdmin(t, ctx, pool, "admin@platform.com", "secret123")
	seedTenant(t, ctx, pool, uuid.New().String(), "tenant-one")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	app := newPlatformApp(pool, authSvc)

	loginRes := postJSON(t, app, "/platform/auth/login", map[string]string{
		"email":    "admin@platform.com",
		"password": "secret123",
	})
	require.Equal(t, http.StatusOK, loginRes.StatusCode)
	defer loginRes.Body.Close()

	var loginBody struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.NewDecoder(loginRes.Body).Decode(&loginBody))
	require.NotEmpty(t, loginBody.Token)

	statsRes := getWithToken(t, app, "/platform/stats", loginBody.Token)
	require.Equal(t, http.StatusOK, statsRes.StatusCode)
	defer statsRes.Body.Close()

	var stats map[string]any
	require.NoError(t, json.NewDecoder(statsRes.Body).Decode(&stats))
	assert.Equal(t, float64(1), stats["total_tenants"])

	metricsRes := getWithToken(t, app, "/platform/metrics", loginBody.Token)
	require.Equal(t, http.StatusOK, metricsRes.StatusCode)
	defer metricsRes.Body.Close()

	var metrics map[string]any
	require.NoError(t, json.NewDecoder(metricsRes.Body).Decode(&metrics))
	assert.Equal(t, float64(1), metrics["total_tenants"])
	assert.Contains(t, metrics, "mrr_estimate_cents")
	assert.Contains(t, metrics, "recent_tenants")
}

func TestPlatform_TenantAndUserCRUD(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startPostgres(t, ctx)
	defer cleanup()

	adminID := seedPlatformAdmin(t, ctx, pool, "admin@platform.com", "secret123")
	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	adminToken, err := authSvc.IssuePlatformToken(adminID, "admin@platform.com")
	require.NoError(t, err)

	app := newPlatformApp(pool, authSvc)

	createRes := postWithToken(t, app, "/platform/tenants", adminToken, map[string]any{
		"name":           "New Co",
		"industry_pack":  "cleaning",
		"plan_id":        "starter",
		"owner_email":    "owner@newco.com",
		"owner_password": "password123",
	})
	require.Equal(t, http.StatusCreated, createRes.StatusCode)
	defer createRes.Body.Close()

	var tenant map[string]any
	require.NoError(t, json.NewDecoder(createRes.Body).Decode(&tenant))
	tenantID, ok := tenant["id"].(string)
	require.True(t, ok)

	getRes := getWithToken(t, app, "/platform/tenants/"+tenantID, adminToken)
	require.Equal(t, http.StatusOK, getRes.StatusCode)
	_ = getRes.Body.Close()

	listUsersRes := getWithToken(t, app, "/platform/users?tenant_id="+tenantID, adminToken)
	require.Equal(t, http.StatusOK, listUsersRes.StatusCode)
	defer listUsersRes.Body.Close()

	var usersBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listUsersRes.Body).Decode(&usersBody))
	require.Len(t, usersBody.Data, 1)
	assert.Equal(t, "owner@newco.com", usersBody.Data[0]["email"])
	assert.NotContains(t, usersBody.Data[0], "password_hash")
}

func startPostgres(t *testing.T, ctx context.Context) (*db.Pool, func()) {
	t.Helper()
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

	connStr, err := pg.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	pool, err := db.Connect(ctx, connStr)
	require.NoError(t, err)

	require.NoError(t, runMigrations(ctx, pool))

	cleanup := func() {
		pool.Close()
		_ = pg.Terminate(ctx)
	}
	return pool, cleanup
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
	for _, m := range platform.Migrations() {
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

func seedPlatformAdmin(t *testing.T, ctx context.Context, pool *db.Pool, email, password string) string {
	t.Helper()
	hash, err := auth.HashPassword(password)
	require.NoError(t, err)
	id := uuid.New().String()
	_, err = pool.Exec(ctx, `
		INSERT INTO platform_admins (id, email, password_hash, role) VALUES ($1, $2, $3, 'super_admin')
	`, id, email, hash)
	require.NoError(t, err)
	return id
}

func newPlatformApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	publicRL := func(c *fiber.Ctx) error { return c.Next() }
	svc := platform.NewService(pool.Pool, authSvc, nil, nil)
	platform.RegisterRoutes(api, svc, authSvc, publicRL)
	return app
}

func getWithToken(t *testing.T, app *fiber.App, path, token string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1"+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}

func postWithToken(t *testing.T, app *fiber.App, path, token string, body any) *http.Response {
	t.Helper()
	payload, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1"+path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}

func patchWithToken(t *testing.T, app *fiber.App, path, token string, body any) *http.Response {
	t.Helper()
	payload, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1"+path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}

func deleteWithToken(t *testing.T, app *fiber.App, path, token string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1"+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}

func postJSON(t *testing.T, app *fiber.App, path string, body any) *http.Response {
	t.Helper()
	payload, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1"+path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}
