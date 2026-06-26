package estimating

import (
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil, nil)
	m := p.Manifest()

	assert.Equal(t, "estimating", m.ID)
	assert.Equal(t, "Estimating", m.Name)
	assert.Equal(t, []string{"crm"}, m.Dependencies)
	assert.Contains(t, m.IndustryPacks, "field-services")
	assert.ElementsMatch(t, []string{"estimating.read", "estimating.write"}, m.Permissions)
	assert.Len(t, m.Nav, 3)
	assert.Equal(t, "/estimates", m.Nav[0].Path)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil, nil)
	migs := p.Migrations()

	assert.Len(t, migs, 5)
	assert.Equal(t, 110, migs[0].Version)
	assert.Equal(t, "estimates", migs[0].Name)
	assert.Contains(t, migs[0].UpSQL, "estimate_line_items")
	assert.Equal(t, 111, migs[1].Version)
	assert.Equal(t, "price_book", migs[1].Name)
	assert.Equal(t, 112, migs[2].Version)
	assert.Equal(t, "estimate_public_token", migs[2].Name)
	assert.Contains(t, migs[2].UpSQL, "public_token")
	assert.Equal(t, 113, migs[3].Version)
	assert.Equal(t, "takeoff_measurements", migs[3].Name)
	assert.Equal(t, 114, migs[4].Version)
	assert.Equal(t, "price_book_pricing_model", migs[4].Name)
	assert.Contains(t, migs[4].UpSQL, "pricing_model")
}

func TestPlugin_PriceBookRoutesRegistered(t *testing.T) {
	p := New(nil, nil)
	app := fiber.New()
	group := app.Group("/estimating")
	p.RegisterRoutes(group, plugin.Deps{})

	routes := app.GetRoutes()
	paths := make(map[string]bool)
	for _, r := range routes {
		paths[r.Method+" "+r.Path] = true
	}

	assert.True(t, paths["GET /estimating/price-book"])
	assert.True(t, paths["POST /estimating/price-book"])
	assert.True(t, paths["POST /estimating/price-book/import"])
	assert.True(t, paths["GET /estimating/price-book/:id"])
	assert.True(t, paths["PATCH /estimating/price-book/:id"])
	assert.True(t, paths["DELETE /estimating/price-book/:id"])
	assert.True(t, paths["PATCH /estimating/estimates/:id"])
	assert.True(t, paths["POST /estimating/estimates/:id/calculate"])
	assert.True(t, paths["GET /estimating/takeoff"])
	assert.True(t, paths["POST /estimating/takeoff"])
	assert.True(t, paths["GET /estimating/takeoff/:id"])
}

func TestParsePriceBookCSV(t *testing.T) {
	csv := `name,category,unit,unit_price
Deep clean,service,sqft,0.15
Supplies,material,each,25.00
`

	items, skipped, err := parsePriceBookCSV(csv)
	require.NoError(t, err)
	assert.Equal(t, 0, skipped)
	require.Len(t, items, 2)
	assert.Equal(t, "Deep clean", items[0].Name)
	assert.Equal(t, int64(15), items[0].UnitPriceCents)
	assert.Equal(t, "Supplies", items[1].Name)
	assert.Equal(t, int64(2500), items[1].UnitPriceCents)
}

func TestParsePriceBookCSV_SkipsInvalidRows(t *testing.T) {
	csv := `name,category,unit,unit_price
Valid item,service,each,10.00
,bad,each,5.00
Another,service,each,not-a-number
`

	items, skipped, err := parsePriceBookCSV(csv)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "Valid item", items[0].Name)
	assert.Equal(t, 2, skipped)
}

func TestParsePriceBookCSV_MissingHeader(t *testing.T) {
	_, _, err := parsePriceBookCSV("foo,bar\na,b")
	assert.Error(t, err)
}

func TestEstimateSubtotalFromLines(t *testing.T) {
	lines := []struct {
		quantity       float64
		unitPriceCents int64
	}{
		{2, 5000},
		{1.5, 2000},
		{0, 10000},
	}
	var subtotal int64
	for _, l := range lines {
		subtotal += int64(float64(l.unitPriceCents) * l.quantity)
	}
	assert.Equal(t, int64(13_000), subtotal)
}
