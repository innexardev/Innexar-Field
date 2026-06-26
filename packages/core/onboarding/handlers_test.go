package onboarding

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/config"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeStore is an in-memory onboarding backend for handler tests.
type fakeStore struct {
	mu    sync.Mutex
	state map[string]*stateRow
}

func newFakeStore() *fakeStore {
	return &fakeStore{state: make(map[string]*stateRow)}
}

func (f *fakeStore) get(tenantID string) *stateRow {
	f.mu.Lock()
	defer f.mu.Unlock()
	if row, ok := f.state[tenantID]; ok {
		cp := *row
		return &cp
	}
	row := &stateRow{
		CurrentStep:    StepBilling,
		CompletedSteps: []string{StepSignup},
		IndustryPacks:  []string{"field-services"},
	}
	f.state[tenantID] = row
	return row
}

func (f *fakeStore) save(tenantID string, row *stateRow) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.state[tenantID] = row
}

type testService struct {
	store *fakeStore
	cfg   *config.AppConfig
	reg   *plugin.Registry
}

func newTestService(store *fakeStore, reg *plugin.Registry) *testService {
	return &testService{
		store: store,
		cfg:   &config.AppConfig{IndustryPacks: DefaultPacks()},
		reg:   reg,
	}
}

func (s *testService) GetStatus(_ context.Context, tenantID string) (*StatusResponse, error) {
	return s.store.get(tenantID).toStatus(), nil
}

func (s *testService) CompleteBilling(_ context.Context, tenantID string) (*StatusResponse, error) {
	row := s.store.get(tenantID)
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepBilling)
	row.CurrentStep = StepIndustry
	s.store.save(tenantID, row)
	return row.toStatus(), nil
}

func (s *testService) SaveIndustry(_ context.Context, tenantID string, packIDs []string) (*StatusResponse, error) {
	if len(packIDs) == 0 {
		return nil, assert.AnError
	}
	row := s.store.get(tenantID)
	row.IndustryPacks = uniqueStrings(packIDs)
	row.Modules = ResolveModulesForPacks(s.cfg, packIDs)
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepIndustry)
	row.CurrentStep = StepProfile
	s.store.save(tenantID, row)
	return row.toStatus(), nil
}

func (s *testService) SaveProfile(_ context.Context, tenantID string, profile Profile) (*StatusResponse, error) {
	row := s.store.get(tenantID)
	row.Profile = profile
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepProfile)
	row.CurrentStep = StepModules
	s.store.save(tenantID, row)
	return row.toStatus(), nil
}

func (s *testService) ModulesPreview(_ context.Context, tenantID string) ([]ModulePreview, error) {
	row := s.store.get(tenantID)
	return BuildModulePreview(s.cfg, s.reg, row.IndustryPacks, row.Modules), nil
}

func (s *testService) UpdateModules(_ context.Context, tenantID string, modules []string) (*StatusResponse, error) {
	if len(modules) == 0 {
		return nil, assert.AnError
	}
	row := s.store.get(tenantID)
	row.Modules = uniqueStrings(modules)
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepModules)
	row.CurrentStep = StepSetup
	s.store.save(tenantID, row)
	return row.toStatus(), nil
}

func (s *testService) SkipSetup(_ context.Context, tenantID string) (*StatusResponse, error) {
	row := s.store.get(tenantID)
	row.SetupSkipped = true
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepSetup)
	row.CurrentStep = StepComplete
	s.store.save(tenantID, row)
	return row.toStatus(), nil
}

func (s *testService) Complete(_ context.Context, tenantID string) (*StatusResponse, []plugin.NavItem, error) {
	row := s.store.get(tenantID)
	now := time.Now().UTC()
	row.CompletedAt = &now
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepComplete)
	row.CurrentStep = StepComplete
	if len(row.Modules) == 0 {
		row.Modules = ResolveModulesForPacks(s.cfg, row.IndustryPacks)
	}
	s.store.save(tenantID, row)
	nav := s.reg.NavItemsFor(row.Modules)
	return row.toStatus(), nav, nil
}

// testHandlerService adapts testService to handler routes via embedding pattern.
type handlerService struct {
	*testService
}

func (h *handlerService) CompleteBilling(ctx context.Context, tenantID string) (*StatusResponse, error) {
	return h.testService.CompleteBilling(ctx, tenantID)
}
func (h *handlerService) GetStatus(ctx context.Context, tenantID string) (*StatusResponse, error) {
	return h.testService.GetStatus(ctx, tenantID)
}
func (h *handlerService) SaveIndustry(ctx context.Context, tenantID string, packIDs []string) (*StatusResponse, error) {
	return h.testService.SaveIndustry(ctx, tenantID, packIDs)
}
func (h *handlerService) SaveProfile(ctx context.Context, tenantID string, profile Profile) (*StatusResponse, error) {
	return h.testService.SaveProfile(ctx, tenantID, profile)
}
func (h *handlerService) ModulesPreview(ctx context.Context, tenantID string) ([]ModulePreview, error) {
	return h.testService.ModulesPreview(ctx, tenantID)
}
func (h *handlerService) UpdateModules(ctx context.Context, tenantID string, modules []string) (*StatusResponse, error) {
	return h.testService.UpdateModules(ctx, tenantID, modules)
}
func (h *handlerService) SkipSetup(ctx context.Context, tenantID string) (*StatusResponse, error) {
	return h.testService.SkipSetup(ctx, tenantID)
}
func (h *handlerService) Complete(ctx context.Context, tenantID string) (*StatusResponse, []plugin.NavItem, error) {
	return h.testService.Complete(ctx, tenantID)
}

func newFakeOnboardingApp(t *testing.T) (*fiber.App, string) {
	t.Helper()
	reg := plugin.NewRegistry()
	_ = reg.Register(handlerStubPlugin{id: "crm"})
	_ = reg.Register(handlerStubPlugin{id: "dispatch"})

	store := newFakeStore()
	ts := newTestService(store, reg)

	// Wrap test service methods into a Service-shaped adapter using a thin proxy.
	// Handlers call *Service methods — we use a real Service with overridden behavior
	// by using the fake via direct handler registration in test app.
	authSvc := auth.NewService("onboarding-test-secret-32-chars!!", 24)
	tenantID := "tenant-test-1"
	token, err := authSvc.IssueToken("user-1", tenantID, "owner@example.com", "owner")
	require.NoError(t, err)

	app := fiber.New()
	api := app.Group("/api/v1")
	protected := api.Group("", ffmiddleware.Auth(authSvc), ffmiddleware.TenantHeader())

	hs := &handlerService{testService: ts}

	protected.Get("/onboarding/status", func(c *fiber.Ctx) error {
		tid, _ := tenantIDFromLocals(c)
		status, err := hs.GetStatus(c.UserContext(), tid)
		if err != nil {
			return fiber.NewError(404, err.Error())
		}
		return c.JSON(status)
	})
	protected.Post("/onboarding/industry", func(c *fiber.Ctx) error {
		tid, _ := tenantIDFromLocals(c)
		var req struct {
			IndustryPacks []string `json:"industry_packs"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		status, err := hs.SaveIndustry(c.UserContext(), tid, req.IndustryPacks)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})
	protected.Post("/onboarding/profile", func(c *fiber.Ctx) error {
		tid, _ := tenantIDFromLocals(c)
		var profile Profile
		if err := c.BodyParser(&profile); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		status, err := hs.SaveProfile(c.UserContext(), tid, profile)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})
	protected.Get("/onboarding/modules/preview", func(c *fiber.Ctx) error {
		tid, _ := tenantIDFromLocals(c)
		preview, err := hs.ModulesPreview(c.UserContext(), tid)
		if err != nil {
			return fiber.NewError(404, err.Error())
		}
		return c.JSON(fiber.Map{"data": preview})
	})
	protected.Patch("/onboarding/modules", func(c *fiber.Ctx) error {
		tid, _ := tenantIDFromLocals(c)
		var req struct {
			Modules []string `json:"modules"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		status, err := hs.UpdateModules(c.UserContext(), tid, req.Modules)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})
	protected.Post("/onboarding/complete", func(c *fiber.Ctx) error {
		tid, _ := tenantIDFromLocals(c)
		status, nav, err := hs.Complete(c.UserContext(), tid)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(fiber.Map{"onboarding": status, "nav": fiber.Map{"data": nav}})
	})
	protected.Post("/onboarding/billing/complete", func(c *fiber.Ctx) error {
		tid, _ := tenantIDFromLocals(c)
		status, err := hs.CompleteBilling(c.UserContext(), tid)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})
	protected.Post("/onboarding/skip-setup", func(c *fiber.Ctx) error {
		tid, _ := tenantIDFromLocals(c)
		status, err := hs.SkipSetup(c.UserContext(), tid)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})

	return app, token
}

func tenantIDFromLocals(c *fiber.Ctx) (string, error) {
	tid, ok := c.Locals("tenant_id").(string)
	if !ok || tid == "" {
		return "", fiber.NewError(401, "missing tenant")
	}
	return tid, nil
}

func TestHandlers_Unauthorized(t *testing.T) {
	app, _ := newFakeOnboardingApp(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/onboarding/status", nil)
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestHandlers_StatusAndIndustryFlow(t *testing.T) {
	app, token := newFakeOnboardingApp(t)

	statusRes := doRequest(t, app, http.MethodGet, "/api/v1/onboarding/status", token, nil)
	require.Equal(t, http.StatusOK, statusRes.StatusCode)
	var status StatusResponse
	decodeJSON(t, statusRes, &status)
	assert.Equal(t, StepBilling, status.Step)
	assert.Contains(t, status.CompletedSteps, StepSignup)

	billingRes := doRequest(t, app, http.MethodPost, "/api/v1/onboarding/billing/complete", token, nil)
	require.Equal(t, http.StatusOK, billingRes.StatusCode)

	industryRes := doRequest(t, app, http.MethodPost, "/api/v1/onboarding/industry", token, map[string]any{
		"industry_packs": []string{"cleaning"},
	})
	require.Equal(t, http.StatusOK, industryRes.StatusCode)
	var afterIndustry StatusResponse
	decodeJSON(t, industryRes, &afterIndustry)
	assert.Equal(t, StepProfile, afterIndustry.Step)
	assert.Contains(t, afterIndustry.Modules, "cleaning")
}

func TestHandlers_ProfileAndModules(t *testing.T) {
	app, token := newFakeOnboardingApp(t)

	_ = doRequest(t, app, http.MethodPost, "/api/v1/onboarding/industry", token, map[string]any{
		"industry_packs": []string{"field-services"},
	})

	profileRes := doRequest(t, app, http.MethodPost, "/api/v1/onboarding/profile", token, map[string]string{
		"state": "TX", "team_size": "5-10", "logo_url": "https://cdn.example/logo.png",
	})
	require.Equal(t, http.StatusOK, profileRes.StatusCode)
	var afterProfile StatusResponse
	decodeJSON(t, profileRes, &afterProfile)
	assert.Equal(t, "TX", afterProfile.Profile.State)
	assert.Equal(t, StepModules, afterProfile.Step)

	previewRes := doRequest(t, app, http.MethodGet, "/api/v1/onboarding/modules/preview", token, nil)
	require.Equal(t, http.StatusOK, previewRes.StatusCode)
	var previewBody struct {
		Data []ModulePreview `json:"data"`
	}
	decodeJSON(t, previewRes, &previewBody)
	assert.NotEmpty(t, previewBody.Data)

	modulesRes := doRequest(t, app, http.MethodPatch, "/api/v1/onboarding/modules", token, map[string]any{
		"modules": []string{"crm", "dispatch", "estimating", "scheduling", "invoicing"},
	})
	require.Equal(t, http.StatusOK, modulesRes.StatusCode)
}

func TestHandlers_SkipSetupAndComplete(t *testing.T) {
	app, token := newFakeOnboardingApp(t)

	skipRes := doRequest(t, app, http.MethodPost, "/api/v1/onboarding/skip-setup", token, nil)
	require.Equal(t, http.StatusOK, skipRes.StatusCode)
	var skipped StatusResponse
	decodeJSON(t, skipRes, &skipped)
	assert.True(t, skipped.SetupSkipped)
	assert.Equal(t, StepComplete, skipped.Step)

	completeRes := doRequest(t, app, http.MethodPost, "/api/v1/onboarding/complete", token, nil)
	require.Equal(t, http.StatusOK, completeRes.StatusCode)
	var completeBody struct {
		Onboarding StatusResponse `json:"onboarding"`
		Nav        struct {
			Data []plugin.NavItem `json:"data"`
		} `json:"nav"`
	}
	decodeJSON(t, completeRes, &completeBody)
	assert.True(t, completeBody.Onboarding.Completed)
}

func doRequest(t *testing.T, app *fiber.App, method, path, token string, body any) *http.Response {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		require.NoError(t, err)
		reader = bytes.NewReader(payload)
	} else {
		reader = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req = req.WithContext(tenant.WithID(req.Context(), ""))
	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	return resp
}

func decodeJSON(t *testing.T, res *http.Response, dest any) {
	t.Helper()
	defer res.Body.Close()
	require.NoError(t, json.NewDecoder(res.Body).Decode(dest))
}

type handlerStubPlugin struct{ id string }

func (h handlerStubPlugin) Manifest() plugin.Manifest {
	return plugin.Manifest{ID: h.id, Name: h.id, Nav: []plugin.NavItem{{Label: h.id, Path: "/" + h.id}}}
}
func (h handlerStubPlugin) RegisterRoutes(fiber.Router, plugin.Deps) {}
func (h handlerStubPlugin) Migrations() []plugin.Migration         { return nil }
