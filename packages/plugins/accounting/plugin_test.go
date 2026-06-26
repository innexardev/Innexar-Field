package accounting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil)
	m := p.Manifest()

	assert.Equal(t, "accounting", m.ID)
	assert.Equal(t, "Accounting", m.Name)
	assert.Equal(t, []string{"invoicing"}, m.Dependencies)
	assert.Contains(t, m.IndustryPacks, "construction")
	assert.ElementsMatch(t, []string{"accounting.read", "accounting.write"}, m.Permissions)
	assert.Len(t, m.Nav, 5)
	assert.Equal(t, "/dashboard/accountant", m.Nav[0].Path)
	assert.Equal(t, "/accounting/chart", m.Nav[1].Path)
	assert.Equal(t, "/purchase-orders", m.Nav[4].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil)
	migs := p.Migrations()

	assert.Len(t, migs, 1)
	assert.Equal(t, 190, migs[0].Version)
	assert.Equal(t, "accounting", migs[0].Name)
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS chart_of_accounts")
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS ap_bills")
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS ar_aging")
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS purchase_orders")
}
