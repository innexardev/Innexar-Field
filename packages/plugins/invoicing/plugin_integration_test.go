//go:build integration

package invoicing_test

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
	"github.com/fieldforge/fieldforge/packages/plugins/invoicing"
	"github.com/fieldforge/fieldforge/packages/plugins/scheduling"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

const tenantAInvoiceNumber = "INV-TENANT-A-001"
const tenantAPaidInvoiceNumber = "INV-TENANT-A-PAID"

func TestInvoicing_ListEndpoints_TenantIsolation(t *testing.T) {
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
	seedInvoicingData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newInvoicingApp(pool, authSvc)

	t.Run("invoices", func(t *testing.T) {
		listA := getJSON(t, app, "/invoicing/invoices", tokenA)
		require.Equal(t, http.StatusOK, listA.StatusCode)
		defer listA.Body.Close()
		var bodyA struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
		require.Len(t, bodyA.Data, 2, "tenant A should see its own invoices")

		listB := getJSON(t, app, "/invoicing/invoices", tokenB)
		require.Equal(t, http.StatusOK, listB.StatusCode)
		defer listB.Body.Close()
		var bodyB struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
		assert.Empty(t, bodyB.Data, "tenant B must not see tenant A invoices")
	})

	t.Run("payments", func(t *testing.T) {
		listA := getJSON(t, app, "/invoicing/payments", tokenA)
		require.Equal(t, http.StatusOK, listA.StatusCode)
		defer listA.Body.Close()
		var bodyA struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
		require.NotEmpty(t, bodyA.Data, "tenant A should see its own payments")
		assert.Contains(t, invoiceNumbers(bodyA.Data), tenantAPaidInvoiceNumber)

		listB := getJSON(t, app, "/invoicing/payments", tokenB)
		require.Equal(t, http.StatusOK, listB.StatusCode)
		defer listB.Body.Close()
		var bodyB struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
		nums := invoiceNumbers(bodyB.Data)
		assert.NotContains(t, nums, tenantAInvoiceNumber, "tenant B must not see tenant A invoice in payments")
		assert.NotContains(t, nums, tenantAPaidInvoiceNumber, "tenant B must not see tenant A paid invoice in payments")
	})
}

func TestInvoicing_JobCompleted_CreatesDraftInvoice(t *testing.T) {
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

	require.NoError(t, runJobCompletedFlowMigrations(ctx, pool))

	tenantID := uuid.New().String()
	seedTenant(t, ctx, pool, tenantID, "job-complete-flow")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	token, err := authSvc.IssueToken(uuid.New().String(), tenantID, "a@example.com", "owner")
	require.NoError(t, err)

	app := newSchedulingApp(pool, authSvc)

	createRes := postJSON(t, app, "/scheduling/jobs", token, map[string]string{
		"title": "Office deep clean",
	})
	require.Equal(t, http.StatusCreated, createRes.StatusCode)
	defer createRes.Body.Close()

	var created map[string]any
	require.NoError(t, json.NewDecoder(createRes.Body).Decode(&created))
	jobID, _ := created["id"].(string)
	require.NotEmpty(t, jobID)

	completeRes := postJSON(t, app, "/scheduling/jobs/"+jobID+"/complete", token, map[string]string{})
	require.Equal(t, http.StatusOK, completeRes.StatusCode)
	_ = completeRes.Body.Close()

	bus := events.NewBus(pool.Pool)
	invPlugin := invoicing.New(pool.Pool, bus)
	poller := events.NewPoller(pool.Pool)
	invPlugin.RegisterOutboxHandlers(poller)
	require.NoError(t, poller.PollOnce(tenant.WithWorker(ctx)))

	tenantCtx := tenant.WithID(ctx, tenantID)
	var invoiceID, status string
	err = pool.QueryRow(tenantCtx, `
		SELECT id, status
		FROM invoices
		WHERE tenant_id = $1 AND job_id = $2
	`, tenantID, jobID).Scan(&invoiceID, &status)
	require.NoError(t, err)
	assert.NotEmpty(t, invoiceID)
	assert.Equal(t, "draft", status)

	require.NoError(t, poller.PollOnce(tenant.WithWorker(ctx)))
	var invoiceCount int
	err = pool.QueryRow(tenantCtx, `
		SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND job_id = $2
	`, tenantID, jobID).Scan(&invoiceCount)
	require.NoError(t, err)
	assert.Equal(t, 1, invoiceCount)
}

func runJobCompletedFlowMigrations(ctx context.Context, pool *db.Pool) error {
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
	schedPlugin := scheduling.New(pool.Pool, bus)
	for _, m := range schedPlugin.Migrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	invPlugin := invoicing.New(pool.Pool, bus)
	for _, m := range invPlugin.Migrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	return pool.RunMigrations(ctx, all)
}

func newSchedulingApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	bus := events.NewBus(pool.Pool)
	_ = reg.Register(scheduling.New(pool.Pool, bus))
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
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}

func invoiceNumbers(rows []map[string]any) []string {
	var nums []string
	for _, row := range rows {
		if n, ok := row["invoice_number"].(string); ok {
			nums = append(nums, n)
		}
	}
	return nums
}

func seedInvoicingData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	_, err := pool.Exec(seedCtx, `
		INSERT INTO invoices (tenant_id, invoice_number, status, total_cents, due_at)
		VALUES ($1, $2, 'draft', 10000, NOW() + INTERVAL '30 days')
	`, tenantID, tenantAInvoiceNumber)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO invoices (tenant_id, invoice_number, status, total_cents, due_at, paid_at)
		VALUES ($1, $2, 'paid', 25000, NOW(), NOW())
	`, tenantID, tenantAPaidInvoiceNumber)
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
	invPlugin := invoicing.New(pool.Pool, bus)
	for _, m := range invPlugin.Migrations() {
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

func newInvoicingApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	bus := events.NewBus(pool.Pool)
	_ = reg.Register(invoicing.New(pool.Pool, bus))
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
