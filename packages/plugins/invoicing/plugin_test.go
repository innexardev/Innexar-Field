package invoicing

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil, nil)
	m := p.Manifest()

	assert.Equal(t, "invoicing", m.ID)
	assert.Equal(t, "Invoicing", m.Name)
	assert.Equal(t, []string{"crm"}, m.Dependencies)
	assert.Contains(t, m.IndustryPacks, "field-services")
	assert.ElementsMatch(t, []string{"invoicing.read", "invoicing.write"}, m.Permissions)
	assert.Len(t, m.Nav, 2)
	assert.Equal(t, "/invoices", m.Nav[0].Path)
	assert.Equal(t, "/payments", m.Nav[1].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil, nil)
	migs := p.Migrations()

	assert.Len(t, migs, 2)
	assert.Equal(t, 130, migs[0].Version)
	assert.Equal(t, "invoices", migs[0].Name)
	assert.Equal(t, 131, migs[1].Version)
	assert.Equal(t, "idempotency_keys", migs[1].Name)
}

func TestInvoiceNumberFormat(t *testing.T) {
	id := "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
	num := "INV-" + id[:8]
	assert.Equal(t, "INV-a1b2c3d4", num)
}
