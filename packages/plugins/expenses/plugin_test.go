package expenses

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil, nil)
	m := p.Manifest()

	assert.Equal(t, "expenses", m.ID)
	assert.Equal(t, "Expenses", m.Name)
	assert.Equal(t, []string{"scheduling"}, m.Dependencies)
	assert.Contains(t, m.IndustryPacks, "construction")
	assert.ElementsMatch(t, []string{"expenses.read", "expenses.write"}, m.Permissions)
	assert.Len(t, m.Nav, 1)
	assert.Equal(t, "/expenses", m.Nav[0].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil, nil)
	migs := p.Migrations()

	assert.Len(t, migs, 1)
	assert.Equal(t, 150, migs[0].Version)
	assert.Equal(t, "expenses", migs[0].Name)
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS expenses")
}
