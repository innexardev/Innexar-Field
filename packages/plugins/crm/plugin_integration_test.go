//go:build integration

package crm_test

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
	"github.com/fieldforge/fieldforge/packages/plugins/crm"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

const tenantALeadNameNew = "Tenant A Lead New"
const tenantALeadNameContacted = "Tenant A Lead Contacted"

func TestCRM_ListEndpoints_TenantIsolation(t *testing.T) {
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
	seedCRMData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newCRMApp(pool, authSvc)

	t.Run("leads", func(t *testing.T) {
		listA := getJSON(t, app, "/crm/leads", tokenA)
		require.Equal(t, http.StatusOK, listA.StatusCode)
		defer listA.Body.Close()
		var bodyA struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
		require.Len(t, bodyA.Data, 2, "tenant A should see its own leads")
		names := leadNames(bodyA.Data)
		assert.Contains(t, names, tenantALeadNameNew)
		assert.Contains(t, names, tenantALeadNameContacted)

		listB := getJSON(t, app, "/crm/leads", tokenB)
		require.Equal(t, http.StatusOK, listB.StatusCode)
		defer listB.Body.Close()
		var bodyB struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
		assert.Empty(t, bodyB.Data, "tenant B must not see tenant A leads")
	})

	t.Run("leads board", func(t *testing.T) {
		boardA := getJSON(t, app, "/crm/leads/board", tokenA)
		require.Equal(t, http.StatusOK, boardA.StatusCode)
		defer boardA.Body.Close()
		var bodyA struct {
			Data []map[string]any `json:"data"`
		}
		require.NoError(t, json.NewDecoder(boardA.Body).Decode(&bodyA))
		require.Len(t, bodyA.Data, 2, "tenant A board should include its own leads")
		names := leadNames(bodyA.Data)
		assert.Contains(t, names, tenantALeadNameNew)
		assert.Contains(t, names, tenantALeadNameContacted)

		boardB := getJSON(t, app, "/crm/leads/board", tokenB)
		require.Equal(t, http.StatusOK, boardB.StatusCode)
		defer boardB.Body.Close()
		var bodyB struct {
			Data    []map[string]any `json:"data"`
			Columns []struct {
				Status string           `json:"status"`
				Leads  []map[string]any `json:"leads"`
				Count  int              `json:"count"`
			} `json:"columns"`
		}
		require.NoError(t, json.NewDecoder(boardB.Body).Decode(&bodyB))
		assert.Empty(t, bodyB.Data, "tenant B board must not include tenant A leads")
		for _, col := range bodyB.Columns {
			assert.Empty(t, col.Leads, "tenant B column %s must be empty", col.Status)
			assert.Equal(t, 0, col.Count, "tenant B column %s count must be zero", col.Status)
		}
		boardNames := leadNames(bodyB.Data)
		assert.NotContains(t, boardNames, tenantALeadNameNew, "tenant B must not see tenant A lead on board")
		assert.NotContains(t, boardNames, tenantALeadNameContacted, "tenant B must not see tenant A lead on board")
	})
}

func leadNames(rows []map[string]any) []string {
	var names []string
	for _, row := range rows {
		if n, ok := row["name"].(string); ok {
			names = append(names, n)
		}
	}
	return names
}

func seedCRMData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	_, err := pool.Exec(seedCtx, `
		INSERT INTO leads (tenant_id, name, email, phone, status)
		VALUES ($1, $2, 'lead-new@tenant-a.com', '555-0001', 'new')
	`, tenantID, tenantALeadNameNew)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO leads (tenant_id, name, email, phone, status)
		VALUES ($1, $2, 'lead-contacted@tenant-a.com', '555-0002', 'contacted')
	`, tenantID, tenantALeadNameContacted)
	require.NoError(t, err)

	var count int
	require.NoError(t, pool.QueryRow(seedCtx, `SELECT COUNT(*) FROM leads WHERE tenant_id = $1`, tenantID).Scan(&count))
	require.Equal(t, 2, count, "seed should insert two leads")
}

func TestCRM_CreateCustomer_Integration(t *testing.T) {
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

	app := newCRMApp(pool, authSvc)

	createRes := postJSON(t, app, "/crm/customers", tokenA, map[string]string{
		"name":  "Acme Cleaning",
		"email": "ops@acme.com",
	})
	require.Equal(t, http.StatusCreated, createRes.StatusCode)
	defer createRes.Body.Close()

	var created map[string]any
	require.NoError(t, json.NewDecoder(createRes.Body).Decode(&created))
	customerID, _ := created["id"].(string)
	require.NotEmpty(t, customerID)

	listRes := getJSON(t, app, "/crm/customers", tokenA)
	require.Equal(t, http.StatusOK, listRes.StatusCode)
	defer listRes.Body.Close()
	var listBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listRes.Body).Decode(&listBody))
	require.Len(t, listBody.Data, 1)

	crossRes := getJSON(t, app, "/crm/customers/"+customerID, tokenB)
	assert.Equal(t, http.StatusNotFound, crossRes.StatusCode)
	_ = crossRes.Body.Close()
}

func TestCRM_ListContractTemplates_Integration(t *testing.T) {
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

	app := newCRMApp(pool, authSvc)

	listA := getJSON(t, app, "/crm/contracts/templates", tokenA)
	require.Equal(t, http.StatusOK, listA.StatusCode)
	defer listA.Body.Close()
	var bodyA struct {
		Data []contractTemplateRow `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listA.Body).Decode(&bodyA))
	require.Len(t, bodyA.Data, 3)
	slugsA := contractTemplateSlugs(bodyA.Data)
	assert.ElementsMatch(t, []string{
		"residential-cleaning",
		"commercial-cleaning",
		"field-service-maintenance",
	}, slugsA)
	assert.Contains(t, bodyA.Data[0].Body, "GOVERNING LAW")

	listB := getJSON(t, app, "/crm/contracts/templates", tokenB)
	require.Equal(t, http.StatusOK, listB.StatusCode)
	defer listB.Body.Close()
	var bodyB struct {
		Data []contractTemplateRow `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listB.Body).Decode(&bodyB))
	require.Len(t, bodyB.Data, 3)
	assert.ElementsMatch(t, slugsA, contractTemplateSlugs(bodyB.Data))

	idsA := contractTemplateIDs(bodyA.Data)
	idsB := contractTemplateIDs(bodyB.Data)
	for _, id := range idsA {
		assert.NotContains(t, idsB, id, "tenant B must have distinct template records")
	}
}

type contractTemplateRow struct {
	ID      string `json:"id"`
	Slug    string `json:"slug"`
	NameKey string `json:"name_key"`
	Body    string `json:"body"`
}

func contractTemplateSlugs(rows []contractTemplateRow) []string {
	slugs := make([]string, len(rows))
	for i, row := range rows {
		slugs[i] = row.Slug
	}
	return slugs
}

func contractTemplateIDs(rows []contractTemplateRow) []string {
	ids := make([]string, len(rows))
	for i, row := range rows {
		ids[i] = row.ID
	}
	return ids
}

func TestCRM_CustomerProperty_BedsBathsSqft_Integration(t *testing.T) {
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
	seedTenant(t, ctx, pool, tenantA, "tenant-a")

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)

	app := newCRMApp(pool, authSvc)

	createCustomer := postJSON(t, app, "/crm/customers", tokenA, map[string]string{
		"name": "Property Test Co",
	})
	require.Equal(t, http.StatusCreated, createCustomer.StatusCode)
	defer createCustomer.Body.Close()
	var customer map[string]any
	require.NoError(t, json.NewDecoder(createCustomer.Body).Decode(&customer))
	customerID, _ := customer["id"].(string)
	require.NotEmpty(t, customerID)

	bedrooms := 3
	bathrooms := 2.5
	sqft := 1800
	createProp := postJSON(t, app, "/crm/customers/"+customerID+"/properties", tokenA, map[string]any{
		"label":     "Main residence",
		"street":    "1200 Oak St",
		"city":      "Austin",
		"state":     "TX",
		"zip":       "78701",
		"is_primary": true,
		"bedrooms":  bedrooms,
		"bathrooms": bathrooms,
		"sqft":      sqft,
	})
	require.Equal(t, http.StatusCreated, createProp.StatusCode)
	defer createProp.Body.Close()
	var createdProp map[string]any
	require.NoError(t, json.NewDecoder(createProp.Body).Decode(&createdProp))
	propertyID, _ := createdProp["id"].(string)
	require.NotEmpty(t, propertyID)
	assert.Equal(t, float64(bedrooms), createdProp["bedrooms"])
	assert.Equal(t, bathrooms, createdProp["bathrooms"])
	assert.Equal(t, float64(sqft), createdProp["sqft"])

	listRes := getJSON(t, app, "/crm/customers/"+customerID+"/properties", tokenA)
	require.Equal(t, http.StatusOK, listRes.StatusCode)
	defer listRes.Body.Close()
	var listBody struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listRes.Body).Decode(&listBody))
	require.Len(t, listBody.Data, 1)
	assert.Equal(t, float64(bedrooms), listBody.Data[0]["bedrooms"])
	assert.Equal(t, bathrooms, listBody.Data[0]["bathrooms"])
	assert.Equal(t, float64(sqft), listBody.Data[0]["sqft"])

	updatedBeds := 4
	updatedSqft := 2100
	patchRes := patchJSON(t, app, "/crm/customers/"+customerID+"/properties/"+propertyID, tokenA, map[string]any{
		"bedrooms": updatedBeds,
		"sqft":     updatedSqft,
	})
	require.Equal(t, http.StatusOK, patchRes.StatusCode)
	defer patchRes.Body.Close()
	var patched map[string]any
	require.NoError(t, json.NewDecoder(patchRes.Body).Decode(&patched))
	assert.Equal(t, float64(updatedBeds), patched["bedrooms"])
	assert.Equal(t, bathrooms, patched["bathrooms"])
	assert.Equal(t, float64(updatedSqft), patched["sqft"])
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
	crmPlugin := crm.New(pool.Pool)
	for _, m := range crmPlugin.Migrations() {
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

func newCRMApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	_ = reg.Register(crm.New(pool.Pool))
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
