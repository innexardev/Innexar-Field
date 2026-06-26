package billing

import (
	"context"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/db"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestCreateCheckout_DoesNotUpdatePlanBeforePayment(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startBillingTestDB(t, ctx)
	defer cleanup()

	tenantID := uuid.New().String()
	seedBillingTenant(t, ctx, pool, tenantID, "starter", "owner@billing.test")

	cfg := mockStripeConfig()
	svc := NewService(pool.Pool, cfg, &MockClient{appURL: "http://localhost:3000"})

	tenantCtx := tenant.WithID(ctx, tenantID)
	_, err := svc.CreateCheckout(tenantCtx, CheckoutRequest{PlanID: "business"})
	require.NoError(t, err)

	var planID string
	err = pool.QueryRow(ctx, `SELECT plan_id FROM tenants WHERE id = $1`, tenantID).Scan(&planID)
	require.NoError(t, err)
	assert.Equal(t, "starter", planID, "plan_id must not change until checkout completes")
}

func TestHandleWebhook_UpdatesPlanOnCheckoutCompleted(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startBillingTestDB(t, ctx)
	defer cleanup()

	tenantID := uuid.New().String()
	seedBillingTenant(t, ctx, pool, tenantID, "starter", "owner@billing.test")

	cfg := mockStripeConfig()
	svc := NewService(pool.Pool, cfg, &MockClient{appURL: "http://localhost:3000"})

	payload := MockWebhookPayload(tenantID, "business")
	err := svc.HandleWebhook(ctx, payload, "mock")
	require.NoError(t, err)

	var planID string
	err = pool.QueryRow(ctx, `SELECT plan_id FROM tenants WHERE id = $1`, tenantID).Scan(&planID)
	require.NoError(t, err)
	assert.Equal(t, "business", planID)
}

func TestHandleWebhook_SetsPastDueOnInvoicePaymentFailed(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := startBillingTestDB(t, ctx)
	defer cleanup()

	tenantID := uuid.New().String()
	customerID := "cus_test_past_due"
	seedBillingTenant(t, ctx, pool, tenantID, "starter", "owner@billing.test")
	_, err := pool.Exec(ctx, `
		UPDATE tenants SET stripe_customer_id = $2, subscription_status = 'active' WHERE id = $1
	`, tenantID, customerID)
	require.NoError(t, err)

	cfg := mockStripeConfig()
	svc := NewService(pool.Pool, cfg, &MockClient{appURL: "http://localhost:3000"})

	payload := []byte(`{
		"id": "evt_fail",
		"type": "invoice.payment_failed",
		"data": {
			"object": {
				"customer": "` + customerID + `"
			}
		}
	}`)
	err = svc.HandleWebhook(ctx, payload, "mock")
	require.NoError(t, err)

	var status string
	err = pool.QueryRow(ctx, `SELECT subscription_status FROM tenants WHERE id = $1`, tenantID).Scan(&status)
	require.NoError(t, err)
	assert.Equal(t, "past_due", status)
}

func mockStripeConfig() *config.AppConfig {
	return &config.AppConfig{
		Debug: config.DebugConfig{
			Features: map[string]interface{}{"mock_stripe": true},
		},
		Pricing: map[string]interface{}{
			"trial_days": 14,
			"plans": map[string]interface{}{
				"starter": map[string]interface{}{
					"id":              "starter",
					"name":            "Starter",
					"price_monthly":   25,
					"stripe_price_id": "price_starter",
				},
				"business": map[string]interface{}{
					"id":              "business",
					"name":            "Business",
					"price_monthly":   99,
					"stripe_price_id": "price_business",
				},
			},
		},
	}
}

func startBillingTestDB(t *testing.T, ctx context.Context) (*db.Pool, func()) {
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
	if err != nil {
		t.Skipf("postgres testcontainer unavailable: %v", err)
	}

	connStr, err := pg.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	pool, err := db.Connect(ctx, connStr)
	require.NoError(t, err)

	var migrations []struct {
		Version int
		Name    string
		UpSQL   string
	}
	for _, m := range coremigrate.Core {
		if m.Version <= 6 {
			migrations = append(migrations, struct {
				Version int
				Name    string
				UpSQL   string
			}{m.Version, m.Name, m.UpSQL})
		}
	}
	require.NoError(t, pool.RunMigrations(ctx, migrations))

	cleanup := func() {
		pool.Close()
		_ = pg.Terminate(ctx)
	}
	return pool, cleanup
}

func seedBillingTenant(t *testing.T, ctx context.Context, pool *db.Pool, tenantID, planID, ownerEmail string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO tenants (id, slug, name, industry_pack, plan_id)
		VALUES ($1, $2, $3, 'field-services', $4)
	`, tenantID, "tenant-"+tenantID[:8], "Test Tenant", planID)
	require.NoError(t, err)

	userID := uuid.New().String()
	_, err = pool.Exec(ctx, `
		INSERT INTO users (id, tenant_id, email, password_hash, role)
		VALUES ($1, $2, $3, 'hash', 'owner')
	`, userID, tenantID, ownerEmail)
	require.NoError(t, err)
}
