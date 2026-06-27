package crm

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil)
	m := p.Manifest()

	assert.Equal(t, "crm", m.ID)
	assert.Equal(t, "CRM", m.Name)
	assert.Contains(t, m.IndustryPacks, "field-services")
	assert.ElementsMatch(t, []string{"crm.read", "crm.write"}, m.Permissions)
	assert.Len(t, m.Nav, 3)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil)
	migs := p.Migrations()

	assert.Len(t, migs, 7)
	assert.Equal(t, 100, migs[0].Version)
	assert.Equal(t, "crm_customers", migs[0].Name)
	assert.Equal(t, 105, migs[5].Version)
	assert.Equal(t, "crm_property_beds_baths_sqft", migs[5].Name)
	assert.Equal(t, 106, migs[6].Version)
	assert.Equal(t, "crm_contracts_terms", migs[6].Name)
}
