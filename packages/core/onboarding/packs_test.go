package onboarding

import (
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveModulesForPacks(t *testing.T) {
	cfg := &config.AppConfig{IndustryPacks: DefaultPacks()}

	mods := ResolveModulesForPacks(cfg, []string{"cleaning"})
	assert.ElementsMatch(t, []string{
		"crm", "estimating", "scheduling", "invoicing", "cleaning",
	}, mods)

	mods = ResolveModulesForPacks(cfg, []string{"construction"})
	assert.Contains(t, mods, "construction")
	assert.Contains(t, mods, "job-costing")

	mods = ResolveModulesForPacks(cfg, []string{"field-services"})
	assert.Contains(t, mods, "dispatch")
	assert.Contains(t, mods, "accounting")
}

func TestBuildModulePreview_IncludesAccountingOptional(t *testing.T) {
	reg := plugin.NewRegistry()
	_ = reg.Register(stubPlugin{id: "accounting"})

	cfg := &config.AppConfig{IndustryPacks: DefaultPacks()}
	preview := BuildModulePreview(cfg, reg, []string{"cleaning"}, nil)

	ids := make([]string, len(preview))
	for i, m := range preview {
		ids[i] = m.ID
	}
	assert.Contains(t, ids, "accounting")
}

func TestListPacks(t *testing.T) {
	packs := ListPacks(&config.AppConfig{IndustryPacks: DefaultPacks()})
	require.Len(t, packs, 3)
	assert.Equal(t, "cleaning", packs[0].ID)
	assert.NotEmpty(t, packs[0].Modules)
}

func TestBuildModulePreview(t *testing.T) {
	reg := plugin.NewRegistry()
	_ = reg.Register(stubPlugin{id: "crm"})
	_ = reg.Register(stubPlugin{id: "dispatch"})

	cfg := &config.AppConfig{IndustryPacks: DefaultPacks()}
	preview := BuildModulePreview(cfg, reg, []string{"field-services"}, nil)

	ids := make([]string, len(preview))
	for i, m := range preview {
		ids[i] = m.ID
	}
	assert.Contains(t, ids, "crm")
	assert.Contains(t, ids, "dispatch")
	assert.Contains(t, ids, "expenses")

	for _, m := range preview {
		if m.ID == "crm" {
			assert.True(t, m.Required)
			assert.True(t, m.Enabled)
		}
	}
}

func TestMarkCompleted(t *testing.T) {
	done := markCompleted([]string{StepSignup}, StepIndustry)
	assert.ElementsMatch(t, []string{StepSignup, StepIndustry}, done)

	again := markCompleted(done, StepIndustry)
	assert.Equal(t, done, again)
}

func TestNextStep(t *testing.T) {
	assert.Equal(t, StepProfile, nextStep(StepIndustry))
	assert.Equal(t, StepComplete, nextStep(StepComplete))
}

type stubPlugin struct{ id string }

func (s stubPlugin) Manifest() plugin.Manifest {
	return plugin.Manifest{ID: s.id, Name: s.id}
}
func (s stubPlugin) RegisterRoutes(fiber.Router, plugin.Deps) {}
func (s stubPlugin) Migrations() []plugin.Migration            { return nil }
