package platform

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/onboarding"
	"github.com/jackc/pgx/v5"
)

var coreModuleIDs = map[string]bool{
	"crm": true, "estimating": true, "scheduling": true, "invoicing": true,
}

var moduleLabels = map[string]struct{ Name, Description string }{
	"crm":           {"CRM", "Customers, leads, and contact management"},
	"estimating":    {"Estimating", "Quotes, proposals, and price books"},
	"scheduling":    {"Scheduling", "Jobs, crews, and calendar"},
	"invoicing":     {"Invoicing", "Billing, payments, and receivables"},
	"cleaning":      {"Cleaning", "Recurring cleans, phases, and checklists"},
	"construction":  {"Construction", "Projects, milestones, and change orders"},
	"job-costing":   {"Job costing", "Budgets, margins, and cost tracking"},
	"dispatch":      {"Dispatch", "Work orders, routing, and field crews"},
	"expenses":      {"Expenses", "Receipts, reimbursements, and job expenses"},
	"payroll":       {"Payroll", "Runs, tax withholding, and timesheets"},
	"accounting":    {"Accounting", "GL, AP/AR, and chart of accounts"},
	"portal":        {"Client portal", "Customer self-service and approvals"},
}

// ModuleCatalogEntry describes a plugin module in the platform catalog.
type ModuleCatalogEntry struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Description   string   `json:"description,omitempty"`
	Core          bool     `json:"core"`
	IndustryPacks []string `json:"industry_packs,omitempty"`
}

// ModuleSettingsResponse is returned by GET /platform/modules.
type ModuleSettingsResponse struct {
	Catalog         []ModuleCatalogEntry       `json:"catalog"`
	GloballyEnabled map[string]bool            `json:"globally_enabled"`
	PackDefaults    map[string]map[string]bool `json:"pack_defaults"`
	IndustryPacks   []onboarding.PackSummary   `json:"industry_packs"`
	UpdatedAt       time.Time                  `json:"updated_at"`
}

// ModuleSettingsPatch is the PATCH body for module settings.
type ModuleSettingsPatch struct {
	GloballyEnabled map[string]bool            `json:"globally_enabled"`
	PackDefaults    map[string]map[string]bool `json:"pack_defaults"`
}

func (s *Service) buildModuleCatalog() []ModuleCatalogEntry {
	packModules := map[string][]string{}
	allIDs := map[string]bool{}

	packs := onboarding.ListPacks(s.appCfg)
	packCfg := onboarding.DefaultPacks()
	if s.appCfg != nil && len(s.appCfg.IndustryPacks) > 0 {
		packCfg = s.appCfg.IndustryPacks
	}

	for _, pack := range packs {
		for _, id := range pack.Modules {
			allIDs[id] = true
			packModules[id] = append(packModules[id], pack.ID)
		}
		if p, ok := packCfg[pack.ID]; ok {
			for _, id := range p.Optional {
				allIDs[id] = true
				packModules[id] = append(packModules[id], pack.ID)
			}
		}
	}
	for id := range coreModuleIDs {
		allIDs[id] = true
	}

	ids := make([]string, 0, len(allIDs))
	for id := range allIDs {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	out := make([]ModuleCatalogEntry, 0, len(ids))
	for _, id := range ids {
		label := moduleLabels[id]
		name := label.Name
		if name == "" {
			name = id
		}
		packs := packModules[id]
		sort.Strings(packs)
		out = append(out, ModuleCatalogEntry{
			ID:            id,
			Name:          name,
			Description:   label.Description,
			Core:          coreModuleIDs[id],
			IndustryPacks: packs,
		})
	}
	return out
}

func defaultPackDefaults() map[string]map[string]bool {
	out := map[string]map[string]bool{}
	for _, pack := range onboarding.ListPacks(nil) {
		mods := map[string]bool{}
		for _, id := range pack.Modules {
			mods[id] = true
		}
		out[pack.ID] = mods
	}
	return out
}

func (s *Service) GetModuleSettings(ctx context.Context) (*ModuleSettingsResponse, error) {
	catalog := s.buildModuleCatalog()
	globallyEnabled := map[string]bool{}
	packDefaults := defaultPackDefaults()
	var updatedAt time.Time

	var raw []byte
	err := s.pool.QueryRow(ctx, `
		SELECT module_settings, updated_at FROM platform_config WHERE id = 1
	`).Scan(&raw, &updatedAt)
	if err != nil && err != pgx.ErrNoRows {
		return nil, fmt.Errorf("load module settings: %w", err)
	}

	stored := map[string]interface{}{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &stored)
	}
	if ge, ok := stored["globally_enabled"].(map[string]interface{}); ok {
		for k, v := range ge {
			if b, ok := v.(bool); ok {
				globallyEnabled[k] = b
			}
		}
	}
	if pd, ok := stored["pack_defaults"].(map[string]interface{}); ok {
		for packID, modsRaw := range pd {
			if mods, ok := modsRaw.(map[string]interface{}); ok {
				packDefaults[packID] = map[string]bool{}
				for modID, enabled := range mods {
					if b, ok := enabled.(bool); ok {
						packDefaults[packID][modID] = b
					}
				}
			}
		}
	}

	for _, entry := range catalog {
		if _, ok := globallyEnabled[entry.ID]; !ok {
			globallyEnabled[entry.ID] = true
		}
	}

	return &ModuleSettingsResponse{
		Catalog:         catalog,
		GloballyEnabled: globallyEnabled,
		PackDefaults:    packDefaults,
		IndustryPacks:   onboarding.ListPacks(s.appCfg),
		UpdatedAt:       updatedAt,
	}, nil
}

func (s *Service) UpdateModuleSettings(ctx context.Context, adminID string, in ModuleSettingsPatch) (*ModuleSettingsResponse, error) {
	current, err := s.GetModuleSettings(ctx)
	if err != nil {
		return nil, err
	}

	globallyEnabled := current.GloballyEnabled
	if in.GloballyEnabled != nil {
		globallyEnabled = in.GloballyEnabled
	}
	packDefaults := current.PackDefaults
	if in.PackDefaults != nil {
		for packID, mods := range in.PackDefaults {
			if packDefaults[packID] == nil {
				packDefaults[packID] = map[string]bool{}
			}
			for modID, enabled := range mods {
				packDefaults[packID][modID] = enabled
			}
		}
	}

	payload, err := json.Marshal(map[string]interface{}{
		"globally_enabled": globallyEnabled,
		"pack_defaults":    packDefaults,
	})
	if err != nil {
		return nil, err
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE platform_config SET module_settings = $1, updated_at = NOW() WHERE id = 1
	`, payload)
	if err != nil {
		return nil, fmt.Errorf("save module settings: %w", err)
	}
	_ = s.audit(ctx, adminID, "update", "module_settings", "1", nil)
	return s.GetModuleSettings(ctx)
}
