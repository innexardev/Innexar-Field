//go:build integration

package identity_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/db"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/identity"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestAuthSignupLoginMe_Integration(t *testing.T) {
	ctx, pool, appCfg, authSvc, identitySvc := setupAuthIntegration(t)
	_ = ctx
	_ = pool
	_ = appCfg
	app := newAuthApp(identitySvc, authSvc, pool)

	email := "owner@integration.test"
	password := "secure-password-123"

	signupRes := postJSON(t, app, "/auth/signup", "", map[string]string{
		"company_name":  "Integration Co",
		"email":         email,
		"password":      password,
		"industry_pack": "field-services",
		"plan_id":       "starter",
	})
	require.Equal(t, http.StatusCreated, signupRes.StatusCode)
	defer signupRes.Body.Close()

	var signupBody struct {
		Token    string `json:"token"`
		TenantID string `json:"tenant_id"`
		UserID   string `json:"user_id"`
	}
	require.NoError(t, json.NewDecoder(signupRes.Body).Decode(&signupBody))
	require.NotEmpty(t, signupBody.Token)
	require.NotEmpty(t, signupBody.TenantID)
	require.NotEmpty(t, signupBody.UserID)

	loginRes := postJSON(t, app, "/auth/login", "", map[string]string{
		"email":    email,
		"password": password,
	})
	require.Equal(t, http.StatusOK, loginRes.StatusCode)
	defer loginRes.Body.Close()

	var loginBody struct {
		Token string `json:"token"`
		User  struct {
			ID       string `json:"id"`
			Email    string `json:"email"`
			TenantID string `json:"tenant_id"`
		} `json:"user"`
	}
	require.NoError(t, json.NewDecoder(loginRes.Body).Decode(&loginBody))
	require.NotEmpty(t, loginBody.Token)
	assert.Equal(t, email, loginBody.User.Email)
	assert.Equal(t, signupBody.UserID, loginBody.User.ID)
	assert.Equal(t, signupBody.TenantID, loginBody.User.TenantID)

	meRes := getJSON(t, app, "/auth/me", loginBody.Token)
	require.Equal(t, http.StatusOK, meRes.StatusCode)
	defer meRes.Body.Close()

	var meBody struct {
		ID       string `json:"id"`
		Email    string `json:"email"`
		Role     string `json:"role"`
		TenantID string `json:"tenant_id"`
	}
	require.NoError(t, json.NewDecoder(meRes.Body).Decode(&meBody))
	assert.Equal(t, signupBody.UserID, meBody.ID)
	assert.Equal(t, email, meBody.Email)
	assert.Equal(t, "owner", meBody.Role)
	assert.Equal(t, signupBody.TenantID, meBody.TenantID)
}

func TestSignupAttribution_Integration(t *testing.T) {
	ctx, pool, _, authSvc, identitySvc := setupAuthIntegration(t)
	app := newAuthApp(identitySvc, authSvc, pool)

	signupRes := postJSON(t, app, "/auth/signup", "", map[string]any{
		"company_name":  "Attribution Co",
		"email":         "attribution@integration.test",
		"password":      "secure-password-123",
		"industry_pack": "field-services",
		"plan_id":       "starter",
		"metadata": map[string]string{
			"ref":          "partner-99",
			"utm_source":   "newsletter",
			"utm_campaign": "referral-q2",
		},
	})
	require.Equal(t, http.StatusCreated, signupRes.StatusCode)
	defer signupRes.Body.Close()

	var signupBody struct {
		TenantID string `json:"tenant_id"`
	}
	require.NoError(t, json.NewDecoder(signupRes.Body).Decode(&signupBody))
	require.NotEmpty(t, signupBody.TenantID)

	var attributionJSON []byte
	err := pool.QueryRow(ctx, `
		SELECT signup_attribution FROM tenants WHERE id = $1
	`, signupBody.TenantID).Scan(&attributionJSON)
	require.NoError(t, err)

	var stored map[string]string
	require.NoError(t, json.Unmarshal(attributionJSON, &stored))
	assert.Equal(t, "partner-99", stored["ref"])
	assert.Equal(t, "newsletter", stored["utm_source"])
	assert.Equal(t, "referral-q2", stored["utm_campaign"])
}

func TestAuthSuspendedTenant_Integration(t *testing.T) {
	ctx, pool, _, authSvc, identitySvc := setupAuthIntegration(t)
	app := newAuthApp(identitySvc, authSvc, pool)

	email := "suspended@integration.test"
	password := "secure-password-123"

	signupRes := postJSON(t, app, "/auth/signup", "", map[string]string{
		"company_name":  "Suspended Co",
		"email":         email,
		"password":      password,
		"industry_pack": "field-services",
		"plan_id":       "starter",
	})
	require.Equal(t, http.StatusCreated, signupRes.StatusCode)
	defer signupRes.Body.Close()

	var signupBody struct {
		Token    string `json:"token"`
		TenantID string `json:"tenant_id"`
	}
	require.NoError(t, json.NewDecoder(signupRes.Body).Decode(&signupBody))
	require.NotEmpty(t, signupBody.Token)

	_, err := pool.Exec(ctx, `UPDATE tenants SET suspended_at = NOW() WHERE id = $1`, signupBody.TenantID)
	require.NoError(t, err)

	loginRes := postJSON(t, app, "/auth/login", "", map[string]string{
		"email":    email,
		"password": password,
	})
	require.Equal(t, http.StatusForbidden, loginRes.StatusCode)
	defer loginRes.Body.Close()

	meRes := getJSON(t, app, "/auth/me", signupBody.Token)
	require.Equal(t, http.StatusForbidden, meRes.StatusCode)
	defer meRes.Body.Close()
}

func setupAuthIntegration(t *testing.T) (context.Context, *db.Pool, *config.AppConfig, *auth.Service, *identity.Service) {
	t.Helper()
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

	require.NoError(t, runCoreMigrations(ctx, pool))
	_, err = pool.Exec(ctx, `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ`)
	require.NoError(t, err)

	appCfg := &config.AppConfig{Features: map[string]bool{}}
	authSvc := auth.NewService("integration-test-secret-32-chars!!", 24)
	identitySvc := identity.NewService(pool.Pool, authSvc, appCfg, false)
	return ctx, pool, appCfg, authSvc, identitySvc
}

func runCoreMigrations(ctx context.Context, pool *db.Pool) error {
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
	return pool.RunMigrations(ctx, all)
}

func newAuthApp(identitySvc *identity.Service, authSvc *auth.Service, pool *db.Pool) *fiber.App {
	app := fiber.New()
	api := app.Group("/api/v1")
	publicRL := func(c *fiber.Ctx) error { return c.Next() }

	api.Post("/auth/signup", publicRL, func(c *fiber.Ctx) error {
		var req identity.SignupRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		res, err := identitySvc.Signup(c.UserContext(), req)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.Status(201).JSON(res)
	})
	api.Post("/auth/login", publicRL, func(c *fiber.Ctx) error {
		var req identity.LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		res, err := identitySvc.Login(c.UserContext(), req)
		if err != nil {
			if ffmiddleware.IsTenantSuspended(err) {
				return fiber.NewError(403, "tenant suspended")
			}
			return fiber.NewError(401, "invalid credentials")
		}
		return c.JSON(res)
	})

	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.RequireTenant(), ffmiddleware.RejectSuspendedTenant(pool.Pool))
	protected.Get("/auth/me", func(c *fiber.Ctx) error {
		uid := c.Locals("user_id").(string)
		u, err := identitySvc.Me(c.UserContext(), uid)
		if err != nil {
			return fiber.NewError(404, "not found")
		}
		return c.JSON(u)
	})
	identity.RegisterRoutes(protected, identitySvc)
	return app
}

func postJSON(t *testing.T, app *fiber.App, path, token string, body any) *http.Response {
	t.Helper()
	payload, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1"+path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
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
