//go:build integration

package dispatch_test

import (
	"bytes"
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
	"github.com/fieldforge/fieldforge/packages/plugins/dispatch"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestDispatch_CreateWorkOrder_TenantIsolation(t *testing.T) {
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

	app := newDispatchApp(pool, authSvc)

	createRes := postJSON(t, app, "/dispatch/work-orders", tokenA, map[string]string{
		"title": "Emergency repair",
	})
	require.Equal(t, http.StatusCreated, createRes.StatusCode)
	defer createRes.Body.Close()

	var created map[string]any
	require.NoError(t, json.NewDecoder(createRes.Body).Decode(&created))
	workOrderID, _ := created["id"].(string)
	require.NotEmpty(t, workOrderID)

	listRes := getJSON(t, app, "/dispatch/work-orders", tokenA)
	require.Equal(t, http.StatusOK, listRes.StatusCode)
	defer listRes.Body.Close()
	var listBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listRes.Body).Decode(&listBody))
	require.Len(t, listBody.Data, 1)

	listBRes := getJSON(t, app, "/dispatch/work-orders", tokenB)
	require.Equal(t, http.StatusOK, listBRes.StatusCode)
	defer listBRes.Body.Close()
	var listBBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listBRes.Body).Decode(&listBBody))
	assert.Empty(t, listBBody.Data, "tenant B must not see tenant A work orders")

	crossRes := getJSON(t, app, "/dispatch/work-orders/"+workOrderID, tokenB)
	assert.Equal(t, http.StatusNotFound, crossRes.StatusCode)
	_ = crossRes.Body.Close()
}

func TestDispatch_CreateAssignment(t *testing.T) {
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
	technicianID := uuid.New().String()
	seedTenant(t, ctx, pool, tenantID, "tenant-assign")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	token, err := authSvc.IssueToken(uuid.New().String(), tenantID, "a@example.com", "owner")
	require.NoError(t, err)

	app := newDispatchApp(pool, authSvc)

	createRes := postJSON(t, app, "/dispatch/work-orders", token, map[string]string{
		"title": "Install thermostat",
	})
	require.Equal(t, http.StatusCreated, createRes.StatusCode)
	defer createRes.Body.Close()

	var created map[string]any
	require.NoError(t, json.NewDecoder(createRes.Body).Decode(&created))
	workOrderID, _ := created["id"].(string)
	require.NotEmpty(t, workOrderID)

	assignRes := postJSON(t, app, "/dispatch/work-orders/"+workOrderID+"/assignments", token, map[string]string{
		"technician_id": technicianID,
	})
	require.Equal(t, http.StatusCreated, assignRes.StatusCode)
	defer assignRes.Body.Close()

	var assignment map[string]any
	require.NoError(t, json.NewDecoder(assignRes.Body).Decode(&assignment))
	assert.Equal(t, workOrderID, assignment["work_order_id"])
	assert.Equal(t, technicianID, assignment["technician_id"])
	assert.Equal(t, "assigned", assignment["status"])

	listRes := getJSON(t, app, "/dispatch/work-orders/"+workOrderID+"/assignments", token)
	require.Equal(t, http.StatusOK, listRes.StatusCode)
	defer listRes.Body.Close()
	var listBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listRes.Body).Decode(&listBody))
	require.Len(t, listBody.Data, 1)
	assert.Equal(t, technicianID, listBody.Data[0]["technician_id"])
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
	dispatchPlugin := dispatch.New(pool.Pool, bus)
	for _, m := range dispatchPlugin.Migrations() {
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

func newDispatchApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	bus := events.NewBus(pool.Pool)
	_ = reg.Register(dispatch.New(pool.Pool, bus))
	reg.RegisterRoutes(protected, plugin.Deps{})
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
