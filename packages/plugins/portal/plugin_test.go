package portal

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil, nil, nil, nil, nil)
	m := p.Manifest()

	assert.Equal(t, "portal", m.ID)
	assert.Equal(t, "Client Portal", m.Name)
	assert.Equal(t, []string{"crm", "invoicing"}, m.Dependencies)
	assert.ElementsMatch(t, []string{"portal.read"}, m.Permissions)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil, nil, nil, nil, nil)
	migs := p.Migrations()

	assert.Len(t, migs, 3)
	assert.Equal(t, 134, migs[0].Version)
	assert.Equal(t, "portal_support_requests", migs[0].Name)
	assert.Contains(t, migs[0].UpSQL, "portal_support_requests")
	assert.Equal(t, 133, migs[1].Version)
	assert.Equal(t, "portal_magic_links", migs[1].Name)
	assert.Contains(t, migs[1].UpSQL, "portal_magic_links")
	assert.Equal(t, 132, migs[2].Version)
	assert.Equal(t, "invoices_customer_rls", migs[2].Name)
	assert.Contains(t, migs[2].UpSQL, "app.customer_id")
}

func TestNewMagicToken(t *testing.T) {
	a := newMagicToken()
	b := newMagicToken()
	assert.Len(t, a, 32)
	assert.NotEqual(t, a, b)
	assert.NotContains(t, a, "-")
}
