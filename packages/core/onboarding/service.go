package onboarding

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/events"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Profile holds company profile fields collected during onboarding.
type Profile struct {
	State    string `json:"state,omitempty"`
	TeamSize string `json:"team_size,omitempty"`
	LogoURL  string `json:"logo_url,omitempty"`
}

// StatusResponse is returned by GET /onboarding/status and signup.
type StatusResponse struct {
	Step           string   `json:"step"`
	CompletedSteps []string `json:"completed_steps"`
	IndustryPacks  []string `json:"industry_packs,omitempty"`
	Profile        Profile  `json:"profile,omitempty"`
	Modules        []string `json:"modules,omitempty"`
	SetupSkipped   bool     `json:"setup_skipped,omitempty"`
	Completed      bool     `json:"completed"`
}

type stateRow struct {
	CurrentStep    string
	CompletedSteps []string
	IndustryPacks  []string
	Profile        Profile
	Modules        []string
	SetupSkipped   bool
	CompletedAt    *time.Time
}

// Service implements onboarding wizard persistence and provisioning.
type Service struct {
	pool     *pgxpool.Pool
	cfg      *config.AppConfig
	registry *plugin.Registry
	events   *events.Bus
}

func NewService(pool *pgxpool.Pool, cfg *config.AppConfig, reg *plugin.Registry, bus *events.Bus) *Service {
	return &Service{pool: pool, cfg: cfg, registry: reg, events: bus}
}

// CreateInitialState seeds onboarding after signup (called from identity).
func CreateInitialState(ctx context.Context, pool *pgxpool.Pool, tenantID, industryPack string) error {
	packs := []string{}
	if industryPack != "" {
		packs = []string{industryPack}
	}
	packsJSON, _ := json.Marshal(packs)
	completedJSON, _ := json.Marshal([]string{StepSignup})

	_, err := pool.Exec(ctx, `
		INSERT INTO onboarding_state (tenant_id, current_step, completed_steps, industry_packs)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (tenant_id) DO NOTHING
	`, tenantID, StepIndustry, completedJSON, packsJSON)
	return err
}

func (s *Service) GetStatus(ctx context.Context, tenantID string) (*StatusResponse, error) {
	row, err := s.loadState(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	return row.toStatus(), nil
}

func (s *Service) SaveIndustry(ctx context.Context, tenantID string, packIDs []string) (*StatusResponse, error) {
	if len(packIDs) == 0 {
		return nil, fmt.Errorf("at least one industry pack is required")
	}
	packIDs = uniqueStrings(packIDs)

	row, err := s.loadState(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	row.IndustryPacks = packIDs
	row.Modules = ResolveModulesForPacks(s.cfg, packIDs)
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepIndustry)
	row.CurrentStep = StepProfile

	if err := s.saveState(ctx, tenantID, row); err != nil {
		return nil, err
	}

	_, _ = s.pool.Exec(ctx, `
		UPDATE tenants SET industry_pack = $2, updated_at = NOW() WHERE id = $1
	`, tenantID, packIDs[0])

	if s.events != nil {
		_ = s.events.Publish(ctx, tenantID, "onboarding.industry_selected", map[string]interface{}{
			"industry_packs": packIDs,
			"modules":        row.Modules,
		})
	}

	return row.toStatus(), nil
}

func (s *Service) SaveProfile(ctx context.Context, tenantID string, profile Profile) (*StatusResponse, error) {
	row, err := s.loadState(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	row.Profile = profile
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepProfile)
	row.CurrentStep = StepModules

	if len(row.Modules) == 0 && len(row.IndustryPacks) > 0 {
		row.Modules = ResolveModulesForPacks(s.cfg, row.IndustryPacks)
	}

	if err := s.saveState(ctx, tenantID, row); err != nil {
		return nil, err
	}
	return row.toStatus(), nil
}

func (s *Service) ModulesPreview(ctx context.Context, tenantID string) ([]ModulePreview, error) {
	row, err := s.loadState(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	packIDs := row.IndustryPacks
	if len(packIDs) == 0 {
		var fallback string
		_ = s.pool.QueryRow(ctx, `SELECT industry_pack FROM tenants WHERE id = $1`, tenantID).Scan(&fallback)
		if fallback != "" {
			packIDs = []string{fallback}
		}
	}
	return BuildModulePreview(s.cfg, s.registry, packIDs, row.Modules), nil
}

func (s *Service) UpdateModules(ctx context.Context, tenantID string, modules []string) (*StatusResponse, error) {
	if len(modules) == 0 {
		return nil, fmt.Errorf("at least one module is required")
	}

	row, err := s.loadState(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	packIDs := row.IndustryPacks
	preview := BuildModulePreview(s.cfg, s.registry, packIDs, nil)
	required := make(map[string]bool)
	for _, m := range preview {
		if m.Required {
			required[m.ID] = true
		}
	}

	selected := uniqueStrings(modules)
	for id := range required {
		found := false
		for _, m := range selected {
			if m == id {
				found = true
				break
			}
		}
		if !found {
			selected = append(selected, id)
		}
	}
	row.Modules = uniqueStrings(selected)
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepModules)
	row.CurrentStep = StepSetup

	if err := s.saveState(ctx, tenantID, row); err != nil {
		return nil, err
	}
	return row.toStatus(), nil
}

func (s *Service) SkipSetup(ctx context.Context, tenantID string) (*StatusResponse, error) {
	row, err := s.loadState(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	row.SetupSkipped = true
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepSetup)
	row.CurrentStep = StepComplete

	if err := s.saveState(ctx, tenantID, row); err != nil {
		return nil, err
	}
	return row.toStatus(), nil
}

// Complete provisions plugins, publishes event, and marks onboarding done.
func (s *Service) Complete(ctx context.Context, tenantID string) (*StatusResponse, []plugin.NavItem, error) {
	row, err := s.loadState(ctx, tenantID)
	if err != nil {
		return nil, nil, err
	}

	if row.CompletedAt != nil {
		nav := s.registry.NavItemsFor(row.Modules)
		return row.toStatus(), nav, nil
	}

	modules := row.Modules
	if len(modules) == 0 {
		packIDs := row.IndustryPacks
		if len(packIDs) == 0 {
			var fallback string
			_ = s.pool.QueryRow(ctx, `SELECT industry_pack FROM tenants WHERE id = $1`, tenantID).Scan(&fallback)
			packIDs = []string{fallback}
		}
		modules = ResolveModulesForPacks(s.cfg, packIDs)
		row.Modules = modules
	}

	if err := s.provisionPlugins(ctx, tenantID, modules); err != nil {
		return nil, nil, err
	}

	now := time.Now().UTC()
	row.CompletedAt = &now
	row.CompletedSteps = markCompleted(row.CompletedSteps, StepComplete)
	row.CurrentStep = StepComplete

	if err := s.saveState(ctx, tenantID, row); err != nil {
		return nil, nil, err
	}

	if s.events != nil {
		_ = s.events.Publish(ctx, tenantID, "onboarding.completed", map[string]interface{}{
			"modules": modules,
		})
	}

	nav := s.registry.NavItemsFor(modules)
	return row.toStatus(), nav, nil
}

func (s *Service) provisionPlugins(ctx context.Context, tenantID string, modules []string) error {
	if err := s.setTenantRLS(ctx, tenantID); err != nil {
		return err
	}

	registered := make(map[string]bool)
	for _, p := range s.registry.All() {
		registered[p.Manifest().ID] = true
	}

	for _, id := range modules {
		if !registered[id] {
			continue
		}
		_, err := s.pool.Exec(ctx, `
			INSERT INTO tenant_plugins (tenant_id, plugin_id, enabled)
			VALUES ($1, $2, true)
			ON CONFLICT (tenant_id, plugin_id) DO UPDATE SET enabled = true
		`, tenantID, id)
		if err != nil {
			return fmt.Errorf("enable plugin %s: %w", id, err)
		}
	}

	for id := range registered {
		enabled := false
		for _, m := range modules {
			if m == id {
				enabled = true
				break
			}
		}
		if !enabled {
			_, _ = s.pool.Exec(ctx, `
				UPDATE tenant_plugins SET enabled = false
				WHERE tenant_id = $1 AND plugin_id = $2
			`, tenantID, id)
		}
	}
	return nil
}

func (s *Service) setTenantRLS(ctx context.Context, tenantID string) error {
	_, err := s.pool.Exec(ctx, `SELECT set_config('app.tenant_id', $1, true)`, tenantID)
	return err
}

func (s *Service) loadState(ctx context.Context, tenantID string) (*stateRow, error) {
	if err := s.setTenantRLS(ctx, tenantID); err != nil {
		return nil, err
	}

	var (
		completedRaw []byte
		packsRaw     []byte
		profileRaw   []byte
		modulesRaw   []byte
		row          stateRow
	)
	err := s.pool.QueryRow(ctx, `
		SELECT current_step, completed_steps, industry_packs, profile, modules, setup_skipped, completed_at
		FROM onboarding_state WHERE tenant_id = $1
	`, tenantID).Scan(
		&row.CurrentStep, &completedRaw, &packsRaw, &profileRaw, &modulesRaw,
		&row.SetupSkipped, &row.CompletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("onboarding state not found")
	}

	_ = json.Unmarshal(completedRaw, &row.CompletedSteps)
	_ = json.Unmarshal(packsRaw, &row.IndustryPacks)
	_ = json.Unmarshal(profileRaw, &row.Profile)
	_ = json.Unmarshal(modulesRaw, &row.Modules)
	return &row, nil
}

func (s *Service) saveState(ctx context.Context, tenantID string, row *stateRow) error {
	if err := s.setTenantRLS(ctx, tenantID); err != nil {
		return err
	}

	completedJSON, _ := json.Marshal(row.CompletedSteps)
	packsJSON, _ := json.Marshal(row.IndustryPacks)
	profileJSON, _ := json.Marshal(row.Profile)
	modulesJSON, _ := json.Marshal(row.Modules)

	_, err := s.pool.Exec(ctx, `
		UPDATE onboarding_state
		SET current_step = $2,
		    completed_steps = $3,
		    industry_packs = $4,
		    profile = $5,
		    modules = $6,
		    setup_skipped = $7,
		    completed_at = $8,
		    updated_at = NOW()
		WHERE tenant_id = $1
	`, tenantID, row.CurrentStep, completedJSON, packsJSON, profileJSON, modulesJSON,
		row.SetupSkipped, row.CompletedAt)
	return err
}

func (r *stateRow) toStatus() *StatusResponse {
	completed := r.CompletedAt != nil
	return &StatusResponse{
		Step:           r.CurrentStep,
		CompletedSteps: nonNilStrings(r.CompletedSteps),
		IndustryPacks:  nonNilStrings(r.IndustryPacks),
		Profile:        r.Profile,
		Modules:        nonNilStrings(r.Modules),
		SetupSkipped:   r.SetupSkipped,
		Completed:      completed,
	}
}

func nonNilStrings(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// TenantIDFromContext reads tenant_id set by auth middleware (JWT only).
func TenantIDFromContext(ctx context.Context) (string, error) {
	id, ok := tenant.ID(ctx)
	if !ok {
		return "", fmt.Errorf("tenant_id missing from context")
	}
	return id, nil
}
