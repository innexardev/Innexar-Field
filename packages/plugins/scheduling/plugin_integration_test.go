//go:build integration

package scheduling_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/db"
	"github.com/fieldforge/fieldforge/packages/core/events"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/plugins/estimating"
	"github.com/fieldforge/fieldforge/packages/plugins/payroll"
	"github.com/fieldforge/fieldforge/packages/plugins/scheduling"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestScheduling_ListJobs_MineFilter(t *testing.T) {
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

	require.NoError(t, runMineFilterMigrations(ctx, pool))

	tenantID := uuid.New().String()
	userID := uuid.New().String()
	employeeID := uuid.New().String()
	otherEmployeeID := uuid.New().String()
	seedTenant(t, ctx, pool, tenantID, "mine-filter")

	tenantCtx := tenant.WithID(ctx, tenantID)
	_, err = pool.Exec(tenantCtx, `
		INSERT INTO users (id, tenant_id, email, password_hash, role)
		VALUES ($1, $2, 'alex@example.com', 'hash', 'technician')
	`, userID, tenantID)
	require.NoError(t, err)
	_, err = pool.Exec(tenantCtx, `
		INSERT INTO employees (id, tenant_id, first_name, last_name, email, user_id, status)
		VALUES ($1, $2, 'Alex', 'Tech', 'alex@example.com', $3, 'active')
	`, employeeID, tenantID, userID)
	require.NoError(t, err)

	now := time.Now().UTC()
	mineJobID := uuid.New().String()
	otherJobID := uuid.New().String()
	_, err = pool.Exec(tenantCtx, `
		INSERT INTO jobs (id, tenant_id, title, status, scheduled_at, assigned_to)
		VALUES
			($1, $2, 'My job', 'scheduled', $3, $4),
			($5, $2, 'Other job', 'scheduled', $3, $6)
	`, mineJobID, tenantID, now, employeeID, otherJobID, otherEmployeeID)
	require.NoError(t, err)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	token, err := authSvc.IssueToken(userID, tenantID, "alex@example.com", "technician")
	require.NoError(t, err)

	app := newSchedulingApp(pool, authSvc)

	mineRes := getJSON(t, app, "/scheduling/jobs?mine=true", token)
	require.Equal(t, http.StatusOK, mineRes.StatusCode)
	defer mineRes.Body.Close()
	var mineBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(mineRes.Body).Decode(&mineBody))
	require.Len(t, mineBody.Data, 1)
	assert.Equal(t, mineJobID, mineBody.Data[0]["id"])

	allRes := getJSON(t, app, "/scheduling/jobs", token)
	require.Equal(t, http.StatusOK, allRes.StatusCode)
	defer allRes.Body.Close()
	var allBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(allRes.Body).Decode(&allBody))
	assert.Len(t, allBody.Data, 2)
}

func runMineFilterMigrations(ctx context.Context, pool *db.Pool) error {
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
	for _, m := range scheduling.New(pool.Pool, bus).Migrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	payrollPlugin := payroll.New(pool.Pool)
	for _, m := range payrollPlugin.Migrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	return pool.RunMigrations(ctx, all)
}

func TestScheduling_CreateJob_TenantIsolation(t *testing.T) {
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

	app := newSchedulingApp(pool, authSvc)

	createRes := postJSON(t, app, "/scheduling/jobs", tokenA, map[string]string{
		"title": "HVAC install",
	})
	require.Equal(t, http.StatusCreated, createRes.StatusCode)
	defer createRes.Body.Close()

	var created map[string]any
	require.NoError(t, json.NewDecoder(createRes.Body).Decode(&created))
	jobID, _ := created["id"].(string)
	require.NotEmpty(t, jobID)

	listRes := getJSON(t, app, "/scheduling/jobs", tokenA)
	require.Equal(t, http.StatusOK, listRes.StatusCode)
	defer listRes.Body.Close()
	var listBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listRes.Body).Decode(&listBody))
	require.Len(t, listBody.Data, 1)

	crossRes := getJSON(t, app, "/scheduling/jobs/"+jobID, tokenB)
	assert.Equal(t, http.StatusNotFound, crossRes.StatusCode)
	_ = crossRes.Body.Close()
}

func TestScheduling_CrewsCRUD_TenantIsolation(t *testing.T) {
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
	seedTenant(t, ctx, pool, tenantA, "crew-a")
	seedTenant(t, ctx, pool, tenantB, "crew-b")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newSchedulingApp(pool, authSvc)

	createRes := postJSON(t, app, "/scheduling/crews", tokenA, map[string]any{
		"name":         "Alpha Team",
		"lead_name":    "Jordan Lee",
		"member_count": 4,
		"skills":       []string{"cleaning", "HVAC"},
	})
	require.Equal(t, http.StatusCreated, createRes.StatusCode)
	defer createRes.Body.Close()

	var created map[string]any
	require.NoError(t, json.NewDecoder(createRes.Body).Decode(&created))
	crewID, _ := created["id"].(string)
	require.NotEmpty(t, crewID)

	listRes := getJSON(t, app, "/scheduling/crews", tokenA)
	require.Equal(t, http.StatusOK, listRes.StatusCode)
	defer listRes.Body.Close()
	var listBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listRes.Body).Decode(&listBody))
	require.Len(t, listBody.Data, 1)

	crossRes := getJSON(t, app, "/scheduling/crews/"+crewID, tokenB)
	assert.Equal(t, http.StatusNotFound, crossRes.StatusCode)
	_ = crossRes.Body.Close()

	patchRes := patchJSON(t, app, "/scheduling/crews/"+crewID, tokenA, map[string]any{
		"status": "off_duty",
	})
	require.Equal(t, http.StatusOK, patchRes.StatusCode)
	_ = patchRes.Body.Close()

	delRes := deleteReq(t, app, "/scheduling/crews/"+crewID, tokenA)
	assert.Equal(t, http.StatusNoContent, delRes.StatusCode)
	_ = delRes.Body.Close()
}

func TestScheduling_QuoteAccepted_CreatesDraftJob(t *testing.T) {
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

	require.NoError(t, runQuoteFlowMigrations(ctx, pool))

	tenantID := uuid.New().String()
	seedTenant(t, ctx, pool, tenantID, "quote-flow")

	estimateID := uuid.New().String()
	tenantCtx := tenant.WithID(ctx, tenantID)
	_, err = pool.Exec(tenantCtx, `
		INSERT INTO estimates (id, tenant_id, title, status)
		VALUES ($1, $2, $3, 'accepted')
	`, estimateID, tenantID, "Kitchen remodel")
	require.NoError(t, err)

	bus := events.NewBus(pool.Pool)
	require.NoError(t, bus.Publish(tenantCtx, tenantID, "estimating.quote.accepted", map[string]string{
		"estimate_id": estimateID,
	}))

	schedPlugin := scheduling.New(pool.Pool, bus)
	poller := events.NewPoller(pool.Pool)
	schedPlugin.RegisterOutboxHandlers(poller)
	require.NoError(t, poller.PollOnce(tenant.WithWorker(ctx)))

	var jobID, status, title string
	err = pool.QueryRow(tenantCtx, `
		SELECT id, status, title
		FROM jobs
		WHERE tenant_id = $1 AND estimate_id = $2
	`, tenantID, estimateID).Scan(&jobID, &status, &title)
	require.NoError(t, err)
	assert.NotEmpty(t, jobID)
	assert.Equal(t, "draft", status)
	assert.Equal(t, "Kitchen remodel", title)

	require.NoError(t, poller.PollOnce(tenant.WithWorker(ctx)))
	var jobCount int
	err = pool.QueryRow(tenantCtx, `
		SELECT COUNT(*) FROM jobs WHERE tenant_id = $1 AND estimate_id = $2
	`, tenantID, estimateID).Scan(&jobCount)
	require.NoError(t, err)
	assert.Equal(t, 1, jobCount)
}

func runQuoteFlowMigrations(ctx context.Context, pool *db.Pool) error {
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
	schedPlugin := scheduling.New(pool.Pool, bus)
	for _, m := range schedPlugin.Migrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	return pool.RunMigrations(ctx, all)
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
	schedPlugin := scheduling.New(pool.Pool, bus)
	for _, m := range schedPlugin.Migrations() {
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

func patchJSON(t *testing.T, app *fiber.App, path, token string, body any) *http.Response {
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

func deleteReq(t *testing.T, app *fiber.App, path, token string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1"+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}
