package communications

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil, nil, nil)
	m := p.Manifest()

	assert.Equal(t, "communications", m.ID)
	assert.Equal(t, "Communications", m.Name)
	assert.Contains(t, m.IndustryPacks, "field-services")
	assert.ElementsMatch(t, []string{"communications.read", "communications.write"}, m.Permissions)
	assert.Len(t, m.Nav, 1)
	assert.Equal(t, "/settings/templates", m.Nav[0].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil, nil, nil)
	migs := p.Migrations()

	assert.Len(t, migs, 2)
	assert.Equal(t, 201, migs[1].Version)
}

func TestRenderSMSBody(t *testing.T) {
	body := RenderSMSBody("Hi {{customer_name}}", map[string]string{"customer_name": "Alex"})
	assert.Contains(t, body, "Alex")
}

func TestRenderTemplate(t *testing.T) {
	subject, body := RenderTemplate(
		"Invoice {{invoice_number}} for {{customer_name}}",
		"<p>Hello {{customer_name}}, your invoice {{invoice_number}} is ready.</p>",
		map[string]string{"customer_name": "Alex Smith", "invoice_number": "INV-42"},
	)
	assert.Equal(t, "Invoice INV-42 for Alex Smith", subject)
	assert.Contains(t, body, "Alex Smith")
	assert.Contains(t, body, "INV-42")
}

func TestNormalizeSlug(t *testing.T) {
	assert.Equal(t, "invoice-reminder", normalizeSlug(" Invoice Reminder "))
	assert.Equal(t, "welcome-email", normalizeSlug("welcome email"))
	assert.Empty(t, normalizeSlug("   "))
}
