package construction

import (
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil, nil)
	m := p.Manifest()

	assert.Equal(t, "construction", m.ID)
	assert.Equal(t, "Construction", m.Name)
	assert.Equal(t, []string{"crm", "estimating"}, m.Dependencies)
	assert.Equal(t, []string{"construction"}, m.IndustryPacks)
	assert.ElementsMatch(t, []string{"construction.read", "construction.write"}, m.Permissions)
	assert.Len(t, m.Nav, 7)
	assert.Equal(t, "/permits", m.Nav[4].Path)
	assert.Equal(t, "/lien-waivers", m.Nav[5].Path)
	assert.Equal(t, "/rfis", m.Nav[6].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil, nil)
	migs := p.Migrations()

	assert.Len(t, migs, 10)
	assert.Equal(t, 180, migs[0].Version)
	assert.Equal(t, "construction_projects", migs[0].Name)
	assert.Equal(t, 181, migs[1].Version)
	assert.Equal(t, "construction_change_orders", migs[1].Name)
	assert.Equal(t, 182, migs[2].Version)
	assert.Equal(t, "construction_milestones", migs[2].Name)
	assert.Equal(t, 183, migs[3].Version)
	assert.Equal(t, "construction_daily_logs", migs[3].Name)
	assert.Contains(t, migs[3].UpSQL, "CREATE TABLE IF NOT EXISTS project_daily_logs")
	assert.Equal(t, 184, migs[4].Version)
	assert.Equal(t, "construction_subcontractors", migs[4].Name)
	assert.Contains(t, migs[4].UpSQL, "CREATE TABLE IF NOT EXISTS subcontractors")
	assert.Equal(t, 185, migs[5].Version)
	assert.Equal(t, "construction_permits", migs[5].Name)
	assert.Contains(t, migs[5].UpSQL, "CREATE TABLE IF NOT EXISTS permits")
	assert.Equal(t, 186, migs[6].Version)
	assert.Equal(t, "construction_lien_waivers", migs[6].Name)
	assert.Contains(t, migs[6].UpSQL, "CREATE TABLE IF NOT EXISTS lien_waivers")
	assert.Equal(t, 187, migs[7].Version)
	assert.Equal(t, "construction_rfis", migs[7].Name)
	assert.Contains(t, migs[7].UpSQL, "CREATE TABLE IF NOT EXISTS rfis")
	assert.Equal(t, 188, migs[8].Version)
	assert.Equal(t, "construction_change_order_workflow", migs[8].Name)
	assert.Equal(t, 189, migs[9].Version)
	assert.Equal(t, "construction_daily_log_photos", migs[9].Name)
	assert.Contains(t, migs[9].UpSQL, "CREATE TABLE IF NOT EXISTS project_daily_log_photos")
}

func TestPlugin_ConstructionRoutesRegistered(t *testing.T) {
	p := New(nil, nil)
	app := fiber.New()
	group := app.Group("/construction")
	p.RegisterRoutes(group, plugin.Deps{})

	paths := make(map[string]bool)
	for _, r := range app.GetRoutes() {
		paths[r.Method+" "+r.Path] = true
	}

	assert.True(t, paths["GET /construction/permits"])
	assert.True(t, paths["POST /construction/permits"])
	assert.True(t, paths["GET /construction/lien-waivers"])
	assert.True(t, paths["POST /construction/lien-waivers"])
	assert.True(t, paths["GET /construction/rfis"])
	assert.True(t, paths["POST /construction/rfis"])
	assert.True(t, paths["POST /construction/change-orders/:id/submit"])
	assert.True(t, paths["POST /construction/change-orders/:id/reject"])
	assert.True(t, paths["GET /construction/projects/:id/permit-alerts"])
	assert.True(t, paths["GET /construction/projects/:id/daily-logs/:logId/photos"])
	assert.True(t, paths["POST /construction/projects/:id/daily-logs/:logId/photos"])
}
