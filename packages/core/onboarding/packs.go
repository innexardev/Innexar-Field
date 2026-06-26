package onboarding

import (
	"sort"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
)

// PackSummary is exposed via GET /industry-packs.
type PackSummary struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Modules     []string `json:"modules"`
}

// ModulePreview describes a plugin module for onboarding UI.
type ModulePreview struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Required    bool   `json:"required"`
	Enabled     bool   `json:"enabled"`
	Description string `json:"description,omitempty"`
}

// DefaultPacks returns built-in packs when config is empty.
func DefaultPacks() map[string]config.IndustryPackConfig {
	return map[string]config.IndustryPackConfig{
		"cleaning": {
			ID: "cleaning", Name: "House Cleaning",
			Description: "Recurring cleans, crews, and client portal",
			CoreModules: []string{"crm", "estimating", "scheduling", "invoicing"},
			Plugins:     []string{"cleaning"},
			Optional:    []string{"dispatch", "expenses"},
		},
		"construction": {
			ID: "construction", Name: "Construction",
			Description: "Estimates, job costing, change orders",
			CoreModules: []string{"crm", "estimating", "scheduling", "invoicing"},
			Plugins:     []string{"construction", "job-costing"},
			Optional:    []string{"dispatch", "expenses"},
		},
		"field-services": {
			ID: "field-services", Name: "Field Services",
			Description: "Dispatch, work orders, and mobile PWA",
			CoreModules: []string{"crm", "estimating", "scheduling", "invoicing"},
			Plugins:     []string{"dispatch"},
			Optional:    []string{"expenses", "job-costing"},
		},
	}
}

func packsFromConfig(cfg *config.AppConfig) map[string]config.IndustryPackConfig {
	if cfg != nil && len(cfg.IndustryPacks) > 0 {
		return cfg.IndustryPacks
	}
	return DefaultPacks()
}

// ListPacks returns industry packs with merged module lists for public API.
func ListPacks(cfg *config.AppConfig) []PackSummary {
	packs := packsFromConfig(cfg)
	ids := make([]string, 0, len(packs))
	for id := range packs {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	out := make([]PackSummary, 0, len(ids))
	for _, id := range ids {
		p := packs[id]
		out = append(out, PackSummary{
			ID:          p.ID,
			Name:        p.Name,
			Description: p.Description,
			Modules:     uniqueStrings(append(append([]string{}, p.CoreModules...), p.Plugins...)),
		})
	}
	return out
}

// ResolveModulesForPacks merges core + plugin modules for the given pack IDs.
func ResolveModulesForPacks(cfg *config.AppConfig, packIDs []string) []string {
	packs := packsFromConfig(cfg)
	var modules []string
	for _, id := range packIDs {
		p, ok := packs[id]
		if !ok {
			continue
		}
		modules = append(modules, p.CoreModules...)
		modules = append(modules, p.Plugins...)
	}
	if len(modules) == 0 && len(packIDs) > 0 {
		modules = DefaultPacks()[packIDs[0]].CoreModules
		modules = append(modules, DefaultPacks()[packIDs[0]].Plugins...)
	}
	return uniqueStrings(modules)
}

// BuildModulePreview builds the modules step UI payload.
func BuildModulePreview(
	cfg *config.AppConfig,
	reg *plugin.Registry,
	packIDs []string,
	selected []string,
) []ModulePreview {
	packs := packsFromConfig(cfg)
	required := make(map[string]bool)
	optional := make(map[string]bool)
	for _, id := range packIDs {
		p, ok := packs[id]
		if !ok {
			continue
		}
		for _, m := range p.CoreModules {
			required[m] = true
		}
		for _, m := range p.Plugins {
			required[m] = true
		}
		for _, m := range p.Optional {
			optional[m] = true
		}
	}

	defaultModules := ResolveModulesForPacks(cfg, packIDs)
	enabledSet := make(map[string]bool)
	if len(selected) > 0 {
		for _, m := range selected {
			enabledSet[m] = true
		}
	} else {
		for _, m := range defaultModules {
			enabledSet[m] = true
		}
	}

	seen := make(map[string]bool)
	previews := make([]ModulePreview, 0)
	add := func(id string, req bool) {
		if seen[id] {
			return
		}
		seen[id] = true
		name := id
		if p, ok := reg.Get(id); ok {
			name = p.Manifest().Name
		}
		previews = append(previews, ModulePreview{
			ID:       id,
			Name:     name,
			Required: req,
			Enabled:  enabledSet[id] || req,
		})
	}

	for id := range required {
		add(id, true)
	}
	for id := range optional {
		add(id, false)
	}
	sort.Slice(previews, func(i, j int) bool { return previews[i].ID < previews[j].ID })
	return previews
}

func uniqueStrings(in []string) []string {
	seen := make(map[string]bool, len(in))
	out := make([]string, 0, len(in))
	for _, s := range in {
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	sort.Strings(out)
	return out
}
