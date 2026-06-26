//go:build integration

package payroll_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/db"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/fieldforge/fieldforge/packages/plugins/payroll"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestPayroll_ListEndpoints_TenantIsolation(t *testing.T) {
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
	seedPayrollData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newPayrollApp(pool, authSvc)

	endpoints := []struct {
		name string
		path string
	}{
		{name: "employees", path: "/payroll/employees"},
		{name: "timesheets", path: "/payroll/timesheets"},
		{name: "payroll runs", path: "/payroll/runs"},
		{name: "tax profiles", path: "/payroll/tax-profiles"},
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
			assert.Empty(t, bodyB.Data, "tenant B must not see tenant A payroll data")
		})
	}
}

func TestPayroll_Workflows(t *testing.T) {
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
	seedTenant(t, ctx, pool, tenantID, "workflow-tenant")
	seedPayrollData(t, ctx, pool, tenantID)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	token, err := authSvc.IssueToken(uuid.New().String(), tenantID, "owner@example.com", "admin")
	require.NoError(t, err)

	app := newPayrollApp(pool, authSvc)

	var timesheetID string
	listTS := getJSON(t, app, "/payroll/timesheets", token)
	require.Equal(t, http.StatusOK, listTS.StatusCode)
	defer listTS.Body.Close()
	var tsBody struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listTS.Body).Decode(&tsBody))
	require.Len(t, tsBody.Data, 1)
	timesheetID = tsBody.Data[0].ID

	submitTS := postJSON(t, app, "/payroll/timesheets/"+timesheetID+"/submit", token, nil)
	require.Equal(t, http.StatusOK, submitTS.StatusCode)
	defer submitTS.Body.Close()
	var submitted struct {
		Status string `json:"status"`
	}
	require.NoError(t, json.NewDecoder(submitTS.Body).Decode(&submitted))
	assert.Equal(t, "submitted", submitted.Status)

	approveTS := postJSON(t, app, "/payroll/timesheets/"+timesheetID+"/approve", token, nil)
	require.Equal(t, http.StatusOK, approveTS.StatusCode)
	defer approveTS.Body.Close()
	var approved struct {
		Status string `json:"status"`
	}
	require.NoError(t, json.NewDecoder(approveTS.Body).Decode(&approved))
	assert.Equal(t, "approved", approved.Status)

	var employeeID string
	listEmp := getJSON(t, app, "/payroll/employees", token)
	require.Equal(t, http.StatusOK, listEmp.StatusCode)
	defer listEmp.Body.Close()
	var empBody struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listEmp.Body).Decode(&empBody))
	require.Len(t, empBody.Data, 1)
	employeeID = empBody.Data[0].ID

	upsertTax := postJSON(t, app, "/payroll/tax-profiles", token, map[string]any{
		"employee_id":   employeeID,
		"filing_status": "married_filing_jointly",
		"allowances":    2,
	})
	require.Equal(t, http.StatusOK, upsertTax.StatusCode)
	defer upsertTax.Body.Close()

	createRun := postJSON(t, app, "/payroll/runs", token, map[string]string{
		"pay_period_start": "2026-06-01",
		"pay_period_end":   "2026-06-15",
	})
	require.Equal(t, http.StatusCreated, createRun.StatusCode)
	defer createRun.Body.Close()
	var run struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	require.NoError(t, json.NewDecoder(createRun.Body).Decode(&run))
	assert.Equal(t, "draft", run.Status)

	submitRun := postJSON(t, app, "/payroll/runs/"+run.ID+"/submit", token, nil)
	require.Equal(t, http.StatusOK, submitRun.StatusCode)
	defer submitRun.Body.Close()
	var submittedRun struct {
		Status          string `json:"status"`
		TotalGrossCents int64  `json:"total_gross_cents"`
		EmployeeCount   int    `json:"employee_count"`
	}
	require.NoError(t, json.NewDecoder(submitRun.Body).Decode(&submittedRun))
	assert.Equal(t, "processing", submittedRun.Status)
	assert.Equal(t, int64(20000), submittedRun.TotalGrossCents)
	assert.Equal(t, 1, submittedRun.EmployeeCount)
}

func TestPayroll_CreateEmployee(t *testing.T) {
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
	seedTenant(t, ctx, pool, tenantA, "create-emp-a")
	seedTenant(t, ctx, pool, tenantB, "create-emp-b")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newPayrollApp(pool, authSvc)

	create := postJSON(t, app, "/payroll/employees", tokenA, map[string]any{
		"first_name":        "Alex",
		"last_name":         "Rivera",
		"email":             "alex@example.com",
		"employment_type":   "w2",
		"hourly_rate_cents": 3000,
	})
	require.Equal(t, http.StatusCreated, create.StatusCode)
	defer create.Body.Close()
	var employee struct {
		ID              string `json:"id"`
		FirstName       string `json:"first_name"`
		LastName        string `json:"last_name"`
		Email           string `json:"email"`
		EmploymentType  string `json:"employment_type"`
		HourlyRateCents int64  `json:"hourly_rate_cents"`
		Status          string `json:"status"`
	}
	require.NoError(t, json.NewDecoder(create.Body).Decode(&employee))
	assert.Equal(t, "Alex", employee.FirstName)
	assert.Equal(t, "Rivera", employee.LastName)
	assert.Equal(t, "alex@example.com", employee.Email)
	assert.Equal(t, "w2", employee.EmploymentType)
	assert.Equal(t, int64(3000), employee.HourlyRateCents)
	assert.Equal(t, "active", employee.Status)

	listA := getJSON(t, app, "/payroll/employees", tokenA)
	require.Equal(t, http.StatusOK, listA.StatusCode)
	defer listA.Body.Close()
	var bodyA struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
	require.Len(t, bodyA.Data, 1)

	listB := getJSON(t, app, "/payroll/employees", tokenB)
	require.Equal(t, http.StatusOK, listB.StatusCode)
	defer listB.Body.Close()
	var bodyB struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
	assert.Empty(t, bodyB.Data)

	invalid := postJSON(t, app, "/payroll/employees", tokenA, map[string]string{
		"first_name": "Only",
	})
	require.Equal(t, http.StatusBadRequest, invalid.StatusCode)
	invalid.Body.Close()
}

func TestPayroll_EmployeeUserLink(t *testing.T) {
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
	userID := uuid.New().String()
	seedTenant(t, ctx, pool, tenantID, "user-link-tenant")
	seedUser(t, ctx, pool, tenantID, userID, "worker@example.com")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	token, err := authSvc.IssueToken(userID, tenantID, "worker@example.com", "owner")
	require.NoError(t, err)

	app := newPayrollApp(pool, authSvc)

	create := postJSON(t, app, "/payroll/employees", token, map[string]any{
		"first_name":        "Sam",
		"last_name":         "Worker",
		"email":             "worker@example.com",
		"employment_type":   "w2",
		"hourly_rate_cents": 2000,
	})
	require.Equal(t, http.StatusCreated, create.StatusCode)
	defer create.Body.Close()
	var employee struct {
		ID string `json:"id"`
	}
	require.NoError(t, json.NewDecoder(create.Body).Decode(&employee))

	patch := patchJSON(t, app, "/payroll/employees/"+employee.ID, token, map[string]any{
		"user_id": userID,
	})
	require.Equal(t, http.StatusOK, patch.StatusCode)
	defer patch.Body.Close()
	var linked struct {
		UserID string `json:"user_id"`
	}
	require.NoError(t, json.NewDecoder(patch.Body).Decode(&linked))
	assert.Equal(t, userID, linked.UserID)

	me := getJSON(t, app, "/payroll/employees/me", token)
	require.Equal(t, http.StatusOK, me.StatusCode)
	defer me.Body.Close()
	var myEmployee struct {
		ID string `json:"id"`
	}
	require.NoError(t, json.NewDecoder(me.Body).Decode(&myEmployee))
	assert.Equal(t, employee.ID, myEmployee.ID)

	clockIn := postJSON(t, app, "/payroll/timesheets", token, map[string]any{
		"action": "clock_in",
	})
	require.Equal(t, http.StatusCreated, clockIn.StatusCode)
	defer clockIn.Body.Close()
	var timesheet struct {
		EmployeeID string `json:"employee_id"`
		Status     string `json:"status"`
	}
	require.NoError(t, json.NewDecoder(clockIn.Body).Decode(&timesheet))
	assert.Equal(t, employee.ID, timesheet.EmployeeID)
	assert.Equal(t, "open", timesheet.Status)
}

func seedPayrollData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	var employeeID string
	err := pool.QueryRow(seedCtx, `
		INSERT INTO employees (tenant_id, first_name, last_name, email, employment_type, hourly_rate_cents, status)
		VALUES ($1, 'Jane', 'Doe', 'jane@example.com', 'w2', 2500, 'active')
		RETURNING id::text
	`, tenantID).Scan(&employeeID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO timesheets (tenant_id, employee_id, work_date, hours, status)
		VALUES ($1, $2, '2026-06-01', 8.0, 'draft')
	`, tenantID, employeeID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO payroll_runs (tenant_id, pay_period_start, pay_period_end, status, total_gross_cents, employee_count)
		VALUES ($1, '2026-06-01', '2026-06-15', 'draft', 20000, 1)
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO payroll_tax_profiles (tenant_id, employee_id, filing_status, allowances)
		VALUES ($1, $2, 'single', 1)
	`, tenantID, employeeID)
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

func seedTenant(t *testing.T, ctx context.Context, pool *db.Pool, tenantID, slug string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO tenants (id, slug, name, industry_pack, plan_id)
		VALUES ($1, $2, $3, 'field-services', 'starter')
	`, tenantID, slug, slug)
	require.NoError(t, err)
}

func seedUser(t *testing.T, ctx context.Context, pool *db.Pool, tenantID, userID, email string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name)
		VALUES ($1, $2, $3, 'hash', 'owner', 'Test', 'User')
	`, userID, tenantID, email)
	require.NoError(t, err)
}

func newPayrollApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	_ = reg.Register(payroll.New(pool.Pool))
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

func postJSON(t *testing.T, app *fiber.App, path, token string, body any) *http.Response {
	t.Helper()
	var reader *strings.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		reader = strings.NewReader(string(b))
	} else {
		reader = strings.NewReader("{}")
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1"+path, reader)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}

func patchJSON(t *testing.T, app *fiber.App, path, token string, body any) *http.Response {
	t.Helper()
	payload, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1"+path, bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}
