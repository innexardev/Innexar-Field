//go:build integration

package estimating_test

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
	"github.com/fieldforge/fieldforge/packages/plugins/crm"
	"github.com/fieldforge/fieldforge/packages/plugins/estimating"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestEstimating_ListEndpoints_TenantIsolation(t *testing.T) {
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
	seedEstimatingData(t, ctx, pool, tenantA)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	tokenA, err := authSvc.IssueToken(uuid.New().String(), tenantA, "a@example.com", "owner")
	require.NoError(t, err)
	tokenB, err := authSvc.IssueToken(uuid.New().String(), tenantB, "b@example.com", "owner")
	require.NoError(t, err)

	app := newEstimatingApp(pool, authSvc)

	endpoints := []struct {
		name string
		path string
	}{
		{name: "estimates", path: "/estimating/estimates"},
		{name: "price book", path: "/estimating/price-book"},
		{name: "takeoff", path: "/estimating/takeoff"},
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
			assert.Empty(t, bodyB.Data, "tenant B must not see tenant A estimating data")
		})
	}
}

func TestEstimating_Calculate_AppliesRoomBasedTier(t *testing.T) {
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
	seedTenant(t, ctx, pool, tenantID, "tenant-tier")
	estimateID, err := seedRoomBasedCalculateFixture(t, ctx, pool, tenantID)
	require.NoError(t, err)

	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	token, err := authSvc.IssueToken(uuid.New().String(), tenantID, "a@example.com", "owner")
	require.NoError(t, err)

	app := newEstimatingApp(pool, authSvc)

	calcResp := postJSON(t, app, "/estimating/estimates/"+estimateID+"/calculate", token, map[string]any{
		"markup_percent": 0,
		"tax_percent":    0,
	})
	require.Equal(t, http.StatusOK, calcResp.StatusCode)
	defer calcResp.Body.Close()

	var calcBody struct {
		SubtotalCents    int64 `json:"subtotal_cents"`
		TierLinesUpdated int   `json:"tier_lines_updated"`
		RoomTiersApplied bool  `json:"room_tiers_applied"`
	}
	require.NoError(t, json.NewDecoder(calcResp.Body).Decode(&calcBody))
	assert.True(t, calcBody.RoomTiersApplied)
	assert.Equal(t, 1, calcBody.TierLinesUpdated)
	assert.Equal(t, int64(18500), calcBody.SubtotalCents)

	detail := getJSON(t, app, "/estimating/estimates/"+estimateID, token)
	require.Equal(t, http.StatusOK, detail.StatusCode)
	defer detail.Body.Close()
	var est struct {
		Lines []struct {
			Description    string `json:"description"`
			UnitPriceCents int64  `json:"unit_price_cents"`
		} `json:"lines"`
	}
	require.NoError(t, json.NewDecoder(detail.Body).Decode(&est))
	require.Len(t, est.Lines, 1)
	assert.Equal(t, int64(18500), est.Lines[0].UnitPriceCents)
}

func seedRoomBasedCalculateFixture(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) (string, error) {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	customerID := uuid.New().String()
	propertyID := uuid.New().String()
	estimateID := uuid.New().String()
	lineID := uuid.New().String()
	priceBookID := uuid.New().String()
	bedrooms := 3
	bathrooms := 2.0

	_, err := pool.Exec(seedCtx, `
		INSERT INTO customers (id, tenant_id, name) VALUES ($1, $2, 'Smith family')
	`, customerID, tenantID)
	if err != nil {
		return "", err
	}

	_, err = pool.Exec(seedCtx, `
		INSERT INTO customer_properties (id, tenant_id, customer_id, label, bedrooms, bathrooms)
		VALUES ($1, $2, $3, 'Main home', $4, $5)
	`, propertyID, tenantID, customerID, bedrooms, bathrooms)
	if err != nil {
		return "", err
	}

	tiers := `[{"beds":3,"baths":2,"price_cents":18500}]`
	_, err = pool.Exec(seedCtx, `
		INSERT INTO price_book_items (id, tenant_id, name, category, unit, unit_price_cents, pricing_model, pricing_tiers)
		VALUES ($1, $2, 'Standard cleaning', 'service', 'visit', 12000, 'room_based', $3::jsonb)
	`, priceBookID, tenantID, tiers)
	if err != nil {
		return "", err
	}

	_, err = pool.Exec(seedCtx, `
		INSERT INTO estimates (id, tenant_id, customer_id, property_id, title, status, subtotal_cents, total_cents)
		VALUES ($1, $2, $3, $4, 'Spring clean', 'draft', 12000, 12000)
	`, estimateID, tenantID, customerID, propertyID)
	if err != nil {
		return "", err
	}

	_, err = pool.Exec(seedCtx, `
		INSERT INTO estimate_line_items (id, tenant_id, estimate_id, description, quantity, unit_price_cents)
		VALUES ($1, $2, $3, 'Standard cleaning', 1, 12000)
	`, lineID, tenantID, estimateID)
	return estimateID, err
}

func seedEstimatingData(t *testing.T, ctx context.Context, pool *db.Pool, tenantID string) {
	t.Helper()
	seedCtx := tenant.WithID(ctx, tenantID)

	_, err := pool.Exec(seedCtx, `
		INSERT INTO estimates (tenant_id, title, status, subtotal_cents, total_cents)
		VALUES ($1, 'Kitchen remodel', 'draft', 150000, 150000)
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO price_book_items (tenant_id, name, category, unit, unit_price_cents)
		VALUES ($1, 'Standard cleaning', 'service', 'hour', 4500)
	`, tenantID)
	require.NoError(t, err)

	_, err = pool.Exec(seedCtx, `
		INSERT INTO takeoff_measurements (tenant_id, label, total_sqft, rooms)
		VALUES ($1, 'Main floor', 1200.00, '[]')
	`, tenantID)
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
	crmPlugin := crm.New(pool.Pool)
	for _, m := range crmPlugin.Migrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	estPlugin := estimating.New(pool.Pool, bus)
	for _, m := range estPlugin.Migrations() {
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

func newEstimatingApp(pool *db.Pool, authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())
	reg := plugin.NewRegistry()
	bus := events.NewBus(pool.Pool)
	_ = reg.Register(estimating.New(pool.Pool, bus))
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
	payload, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1"+path, bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}
