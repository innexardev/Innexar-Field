package jobcosting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil)
	m := p.Manifest()

	assert.Equal(t, "job-costing", m.ID)
	assert.Equal(t, "Job Costing", m.Name)
	assert.Equal(t, []string{"scheduling"}, m.Dependencies)
	assert.Contains(t, m.IndustryPacks, "construction")
	assert.ElementsMatch(t, []string{"job-costing.read", "job-costing.write"}, m.Permissions)
	assert.Len(t, m.Nav, 1)
	assert.Equal(t, "/job-costing", m.Nav[0].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil)
	migs := p.Migrations()

	assert.Len(t, migs, 1)
	assert.Equal(t, 160, migs[0].Version)
	assert.Equal(t, "job_costing", migs[0].Name)
	assert.Contains(t, migs[0].UpSQL, "job_cost_lines")
}

func TestJobCostLine_VarianceCents(t *testing.T) {
	line := JobCostLine{BudgetCents: 100_00, ActualCents: 75_00}
	line.VarianceCents = line.BudgetCents - line.ActualCents
	assert.Equal(t, int64(25_00), line.VarianceCents)
}

func TestJobSummary_TotalVariance(t *testing.T) {
	summary := JobSummary{TotalBudget: 50_000, TotalActual: 42_500}
	summary.TotalVariance = summary.TotalBudget - summary.TotalActual
	assert.Equal(t, int64(7_500), summary.TotalVariance)
}
