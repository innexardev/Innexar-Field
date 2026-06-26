//go:build integration

package communications_test

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
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/plugins/communications"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestCommunications_Templates_TenantIsolation(t *testing.T) {
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
	seedTemplate(t, ctx, pool, tenantA, "welcome", "Welcome", "<p>Hi</p>")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newCommunicationsApp(pool, authSvc)

	listA := getJSON(t, app, "/communications/templates", tokenA)
	require.Equal(t, http.StatusOK, listA.StatusCode)
	defer listA.Body.Close()
	var bodyA struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
	require.Len(t, bodyA.Data, 1)
	assert.Equal(t, "welcome", bodyA.Data[0]["slug"])

	listB := getJSON(t, app, "/communications/templates", tokenB)
	require.Equal(t, http.StatusOK, listB.StatusCode)
	defer listB.Body.Close()
	var bodyB struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
	assert.Empty(t, bodyB.Data)
}

func TestCommunications_CreateAndTestSend(t *testing.T) {
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

	tenantID := uuid.New().String()
	seedTenant(t, ctx, pool, tenantID, "tenant-test")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	token, err := authSvc.IssueToken(uuid.New().String(), tenantID, "owner@example.com", "owner")
	require.NoError(t, err)

	app := newCommunicationsApp(pool, authSvc)

	create := postJSON(t, app, "/communications/templates", token, map[string]any{
		"slug":      "invoice-ready",
		"subject":   "Invoice {{invoice_number}}",
		"body_html": "<p>Hello {{customer_name}}</p>",
		"active":    true,
	})
	require.Equal(t, http.StatusCreated, create.StatusCode)
	defer create.Body.Close()
	var created map[string]any
	require.NoError(t, json.NewDecoder(create.Body).Decode(&created))
	id, ok := created["id"].(string)
	require.True(t, ok)

	testSend := postJSON(t, app, "/communications/templates/"+id+"/test-send", token, map[string]any{
		"to": "test@example.com",
	})
	require.Equal(t, http.StatusOK, testSend.StatusCode)
	defer testSend.Body.Close()
	var sendResult map[string]any
	require.NoError(t, json.NewDecoder(testSend.Body).Decode(&sendResult))
	assert.Equal(t, "log", sendResult["mode"])
}

func runMigrations(ctx context.Context, pool *db.Pool) error {
	reg := plugin.NewRegistry()
	_ = reg.Register(communications.New(pool.Pool, nil, nil))

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

func seedTenant(t *testing.T, ctx context.Context, pool *db.Pool, id, slug string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO tenants (id, name, slug, industry_pack) VALUES ($1, $2, $3, 'cleaning')
	`, id, slug, slug)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO tenant_plugins (tenant_id, plugin_id, enabled) VALUES ($1, 'communications', true)
	`, id)
	require.NoError(t, err)
}

func seedTemplate(t *testing.T, ctx context.Context, pool *db.Pool, tenantID, slug, subject, body string) {
	t.Helper()
	tctx := tenant.WithID(ctx, tenantID)
	_, err := pool.Exec(tctx, `
		INSERT INTO email_templates (id, tenant_id, slug, subject, body_html, active)
		VALUES ($1, $2, $3, $4, $5, true)
	`, uuid.New().String(), tenantID, slug, subject, body)
	require.NoError(t, err)
}

func newCommunicationsApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	reg := plugin.NewRegistry()
	_ = reg.Register(communications.New(pool.Pool, nil, nil))

	api := app.Group("/api/v1",
		ffmiddleware.Auth(authSvc),
		ffmiddleware.RequireTenant(),
		ffmiddleware.TenantHeader(),
	)
	comm := api.Group("/communications")
	if p, ok := reg.Get("communications"); ok {
		p.RegisterRoutes(comm, plugin.Deps{})
	}
	return app
}

func getJSON(t *testing.T, app *fiber.App, path, token string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1"+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	require.NoError(t, err)
	return resp
}

func postJSON(t *testing.T, app *fiber.App, path, token string, body any) *http.Response {
	t.Helper()
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1"+path, bytes.NewReader(raw))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	return resp
}
