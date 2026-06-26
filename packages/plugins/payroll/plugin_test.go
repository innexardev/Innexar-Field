package payroll

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil)
	m := p.Manifest()

	assert.Equal(t, "payroll", m.ID)
	assert.Equal(t, "Payroll", m.Name)
	assert.Equal(t, []string{"scheduling"}, m.Dependencies)
	assert.Contains(t, m.IndustryPacks, "construction")
	assert.ElementsMatch(t, []string{"payroll.read", "payroll.write"}, m.Permissions)
	assert.Len(t, m.Nav, 4)
	assert.Equal(t, "/payroll", m.Nav[0].Path)
	assert.Equal(t, "/payroll/runs", m.Nav[1].Path)
	assert.Equal(t, "/payroll/tax", m.Nav[2].Path)
	assert.Equal(t, "/timesheets", m.Nav[3].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil)
	migs := p.Migrations()

	assert.Len(t, migs, 1)
	assert.Equal(t, 200, migs[0].Version)
	assert.Equal(t, "payroll", migs[0].Name)
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS employees")
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS timesheets")
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS payroll_runs")
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS payroll_tax_profiles")
}

func TestValidEmploymentTypes(t *testing.T) {
	assert.True(t, validEmploymentTypes["w2"])
	assert.True(t, validEmploymentTypes["1099"])
	assert.False(t, validEmploymentTypes["contractor"])
}
