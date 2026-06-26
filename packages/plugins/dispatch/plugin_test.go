package dispatch

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil, nil)
	m := p.Manifest()

	assert.Equal(t, "dispatch", m.ID)
	assert.Equal(t, "Dispatch", m.Name)
	assert.Equal(t, []string{"scheduling"}, m.Dependencies)
	assert.Contains(t, m.IndustryPacks, "field-services")
	assert.ElementsMatch(t, []string{"dispatch.read", "dispatch.write"}, m.Permissions)
	assert.Len(t, m.Nav, 2)
	assert.Equal(t, "/work-orders", m.Nav[0].Path)
	assert.Equal(t, "/dispatch", m.Nav[1].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil, nil)
	migs := p.Migrations()

	assert.Len(t, migs, 1)
	assert.Equal(t, 140, migs[0].Version)
	assert.Equal(t, "dispatch_work_orders", migs[0].Name)
	assert.Contains(t, migs[0].UpSQL, "work_orders")
	assert.Contains(t, migs[0].UpSQL, "work_order_assignments")
}
