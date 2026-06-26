package estimating

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/events"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct {
	pool   *pgxpool.Pool
	bus    *events.Bus
	appCfg *config.AppConfig
}

func New(pool *pgxpool.Pool, bus *events.Bus) *Plugin {
	return &Plugin{pool: pool, bus: bus}
}

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "estimating",
		Name:          "Estimating",
		Version:       "1.0.0",
		Dependencies:  []string{"crm"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"estimating.read", "estimating.write"},
		Nav: []plugin.NavItem{
			{Label: "Estimates", Path: "/estimates", Icon: "file-text"},
			{Label: "Price book", Path: "/price-book", Icon: "calculator"},
			{Label: "Takeoff", Path: "/takeoff", Icon: "clipboard-list"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	p.registerConfig(deps)
	router.Get("/estimates", p.list)
	router.Post("/estimates", p.create)
	router.Get("/estimates/:id/pdf", p.estimatePDF)
	router.Get("/estimates/:id", p.get)
	router.Patch("/estimates/:id", p.update)
	router.Post("/estimates/:id/calculate", p.calculate)
	router.Post("/estimates/:id/send", p.sendQuote)
	router.Post("/estimates/:id/accept", p.accept)
	router.Get("/price-book", p.listPriceBook)
	router.Post("/price-book/import", p.importPriceBook)
	router.Post("/price-book", p.createPriceBook)
	router.Get("/price-book/:id", p.getPriceBook)
	router.Patch("/price-book/:id", p.updatePriceBook)
	router.Delete("/price-book/:id", p.deletePriceBook)
	router.Get("/takeoff", p.listTakeoff)
	router.Post("/takeoff", p.createTakeoff)
	router.Get("/takeoff/:id", p.getTakeoff)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 110, Name: "estimates", UpSQL: estimatesSQL},
		{Version: 111, Name: "price_book", UpSQL: priceBookSQL},
		{Version: 112, Name: "estimate_public_token", UpSQL: publicTokenSQL},
		{Version: 113, Name: "takeoff_measurements", UpSQL: takeoffSQL},
		{Version: 114, Name: "price_book_pricing_model", UpSQL: priceBookPricingModelSQL},
		{Version: 115, Name: "estimate_property_id", UpSQL: estimatePropertyIDSQL},
	}
}

const estimatesSQL = `
CREATE TABLE IF NOT EXISTS estimates (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID,
	title TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	subtotal_cents BIGINT NOT NULL DEFAULT 0,
	total_cents BIGINT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS estimate_line_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
	description TEXT NOT NULL,
	quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
	unit_price_cents BIGINT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates FORCE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS estimates_tenant ON estimates;
CREATE POLICY estimates_tenant ON estimates USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
DROP POLICY IF EXISTS estimate_lines_tenant ON estimate_line_items;
CREATE POLICY estimate_lines_tenant ON estimate_line_items USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const priceBookSQL = `
CREATE TABLE IF NOT EXISTS price_book_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	name TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT 'service',
	unit TEXT NOT NULL DEFAULT 'each',
	unit_price_cents BIGINT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE price_book_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_book_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_book_tenant ON price_book_items;
CREATE POLICY price_book_tenant ON price_book_items USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const priceBookPricingModelSQL = `
ALTER TABLE price_book_items ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'flat';
ALTER TABLE price_book_items ADD COLUMN IF NOT EXISTS pricing_tiers JSONB NOT NULL DEFAULT '[]';
`

const estimatePropertyIDSQL = `
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS property_id UUID;
CREATE INDEX IF NOT EXISTS idx_estimates_property ON estimates (tenant_id, property_id) WHERE property_id IS NOT NULL;
`

const publicTokenSQL = `
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_estimates_public_token ON estimates (public_token) WHERE public_token IS NOT NULL;

DROP POLICY IF EXISTS estimates_tenant ON estimates;
CREATE POLICY estimates_tenant ON estimates USING (
	tenant_id = current_setting('app.tenant_id', true)::uuid
	OR (
		public_token IS NOT NULL
		AND public_token = current_setting('app.public_token', true)
		AND status IN ('sent', 'accepted', 'rejected')
	)
);

DROP POLICY IF EXISTS estimate_lines_tenant ON estimate_line_items;
CREATE POLICY estimate_lines_tenant ON estimate_line_items USING (
	tenant_id = current_setting('app.tenant_id', true)::uuid
	OR estimate_id IN (
		SELECT id FROM estimates
		WHERE public_token IS NOT NULL
			AND public_token = current_setting('app.public_token', true)
			AND status IN ('sent', 'accepted', 'rejected')
	)
);
`

const takeoffSQL = `
CREATE TABLE IF NOT EXISTS takeoff_measurements (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	label TEXT NOT NULL,
	total_sqft NUMERIC(12,2) NOT NULL DEFAULT 0,
	rooms JSONB NOT NULL DEFAULT '[]',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE takeoff_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE takeoff_measurements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS takeoff_tenant ON takeoff_measurements;
CREATE POLICY takeoff_tenant ON takeoff_measurements USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type EstimateProperty struct {
	ID        string   `json:"id"`
	Label     string   `json:"label"`
	Bedrooms  *int     `json:"bedrooms,omitempty"`
	Bathrooms *float64 `json:"bathrooms,omitempty"`
}

type Estimate struct {
	ID            string    `json:"id"`
	CustomerID    string    `json:"customer_id,omitempty"`
	PropertyID    string    `json:"property_id,omitempty"`
	Title         string    `json:"title"`
	Status        string    `json:"status"`
	SubtotalCents int64     `json:"subtotal_cents"`
	TotalCents    int64     `json:"total_cents"`
	PublicToken   string    `json:"public_token,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

func (p *Plugin) list(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), title, status, subtotal_cents, total_cents, created_at
		FROM estimates WHERE tenant_id = $1 ORDER BY created_at DESC
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list estimates")
	}
	defer rows.Close()
	var list []Estimate
	for rows.Next() {
		var e Estimate
		_ = rows.Scan(&e.ID, &e.CustomerID, &e.Title, &e.Status, &e.SubtotalCents, &e.TotalCents, &e.CreatedAt)
		list = append(list, e)
	}
	return response.DataList(c, list)
}

func (p *Plugin) create(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Title      string `json:"title"`
		CustomerID string `json:"customer_id"`
		PropertyID string `json:"property_id"`
		Lines      []struct {
			Description    string  `json:"description"`
			Quantity       float64 `json:"quantity"`
			UnitPriceCents int64   `json:"unit_price_cents"`
		} `json:"lines"`
	}
	if err := c.BodyParser(&body); err != nil || body.Title == "" {
		return fiber.NewError(400, "title required")
	}
	id := uuid.New().String()
	var subtotal int64
	for _, l := range body.Lines {
		subtotal += int64(float64(l.UnitPriceCents) * l.Quantity)
	}
	if err := p.validateEstimateProperty(c.UserContext(), tid, body.CustomerID, body.PropertyID); err != nil {
		return err
	}
	_, err := p.pool.Exec(c.UserContext(), `
		INSERT INTO estimates (id, tenant_id, customer_id, property_id, title, subtotal_cents, total_cents)
		VALUES ($1, $2, NULLIF($3,'')::uuid, NULLIF($4,'')::uuid, $5, $6, $6)
	`, id, tid, body.CustomerID, body.PropertyID, body.Title, subtotal)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create estimate")
	}
	for _, l := range body.Lines {
		_, _ = p.pool.Exec(c.UserContext(), `
			INSERT INTO estimate_line_items (id, tenant_id, estimate_id, description, quantity, unit_price_cents)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, uuid.New().String(), tid, id, l.Description, l.Quantity, l.UnitPriceCents)
	}
	return c.Status(201).JSON(Estimate{ID: id, Title: body.Title, Status: "draft", SubtotalCents: subtotal, TotalCents: subtotal})
}

type EstimateLine struct {
	ID             string  `json:"id"`
	Description    string  `json:"description"`
	Quantity       float64 `json:"quantity"`
	UnitPriceCents int64   `json:"unit_price_cents"`
}

func (p *Plugin) get(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var e Estimate
	var propertyID *string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), property_id::text, title, status, subtotal_cents, total_cents,
		       COALESCE(public_token, ''), created_at
		FROM estimates WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(
		&e.ID, &e.CustomerID, &propertyID, &e.Title, &e.Status, &e.SubtotalCents, &e.TotalCents, &e.PublicToken, &e.CreatedAt,
	)
	if err != nil {
		return fiber.NewError(404, "not found")
	}
	if propertyID != nil {
		e.PropertyID = *propertyID
	}
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, description, quantity, unit_price_cents
		FROM estimate_line_items WHERE estimate_id = $1 AND tenant_id = $2 ORDER BY created_at
	`, c.Params("id"), tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load estimate")
	}
	defer rows.Close()
	var lines []EstimateLine
	for rows.Next() {
		var l EstimateLine
		_ = rows.Scan(&l.ID, &l.Description, &l.Quantity, &l.UnitPriceCents)
		lines = append(lines, l)
	}
	resp := fiber.Map{
		"id":             e.ID,
		"customer_id":    e.CustomerID,
		"title":          e.Title,
		"status":         e.Status,
		"subtotal_cents": e.SubtotalCents,
		"total_cents":    e.TotalCents,
		"public_token":   e.PublicToken,
		"created_at":     e.CreatedAt,
		"lines":          response.NilToEmpty(lines),
	}
	if e.PropertyID != "" {
		resp["property_id"] = e.PropertyID
		if prop, err := p.loadEstimateProperty(c.UserContext(), tid, e.PropertyID); err == nil {
			resp["property"] = prop
		}
	}
	return c.JSON(resp)
}

type lineInput struct {
	Description    string  `json:"description"`
	Quantity       float64 `json:"quantity"`
	UnitPriceCents int64   `json:"unit_price_cents"`
}

func subtotalFromLines(lines []lineInput) int64 {
	var subtotal int64
	for _, l := range lines {
		subtotal += int64(math.Round(float64(l.UnitPriceCents) * l.Quantity))
	}
	return subtotal
}

func (p *Plugin) update(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")
	var body struct {
		Title      *string     `json:"title"`
		CustomerID *string     `json:"customer_id"`
		PropertyID *string     `json:"property_id"`
		Lines      []lineInput `json:"lines"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	var status string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT status FROM estimates WHERE id = $1 AND tenant_id = $2
	`, id, tid).Scan(&status)
	if err != nil {
		return fiber.NewError(404, "not found")
	}
	if status != "draft" {
		return fiber.NewError(400, "only draft estimates can be edited")
	}
	if body.Title != nil {
		_, err = p.pool.Exec(c.UserContext(), `
			UPDATE estimates SET title = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2
		`, id, tid, *body.Title)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update estimate")
		}
	}
	if body.CustomerID != nil {
		_, err = p.pool.Exec(c.UserContext(), `
			UPDATE estimates SET customer_id = NULLIF($3,'')::uuid, updated_at = NOW() WHERE id = $1 AND tenant_id = $2
		`, id, tid, *body.CustomerID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update estimate")
		}
	}
	if body.PropertyID != nil {
		var customerID string
		_ = p.pool.QueryRow(c.UserContext(), `
			SELECT COALESCE(customer_id::text, '') FROM estimates WHERE id = $1 AND tenant_id = $2
		`, id, tid).Scan(&customerID)
		if err := p.validateEstimateProperty(c.UserContext(), tid, customerID, *body.PropertyID); err != nil {
			return err
		}
		_, err = p.pool.Exec(c.UserContext(), `
			UPDATE estimates SET property_id = NULLIF($3,'')::uuid, updated_at = NOW() WHERE id = $1 AND tenant_id = $2
		`, id, tid, *body.PropertyID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update estimate")
		}
	}
	if body.Lines != nil {
		_, err = p.pool.Exec(c.UserContext(), `
			DELETE FROM estimate_line_items WHERE estimate_id = $1 AND tenant_id = $2
		`, id, tid)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update estimate")
		}
		subtotal := subtotalFromLines(body.Lines)
		for _, l := range body.Lines {
			if l.Description == "" {
				continue
			}
			_, _ = p.pool.Exec(c.UserContext(), `
				INSERT INTO estimate_line_items (id, tenant_id, estimate_id, description, quantity, unit_price_cents)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, uuid.New().String(), tid, id, l.Description, l.Quantity, l.UnitPriceCents)
		}
		_, err = p.pool.Exec(c.UserContext(), `
			UPDATE estimates SET subtotal_cents = $3, total_cents = $3, updated_at = NOW()
			WHERE id = $1 AND tenant_id = $2
		`, id, tid, subtotal)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update estimate")
		}
	}
	return p.get(c)
}

type CalculateResult struct {
	SubtotalCents      int64    `json:"subtotal_cents"`
	MarkupCents        int64    `json:"markup_cents"`
	TaxCents           int64    `json:"tax_cents"`
	TotalCents         int64    `json:"total_cents"`
	MarkupPercent      float64  `json:"markup_percent"`
	TaxPercent         float64  `json:"tax_percent"`
	TierLinesUpdated   int      `json:"tier_lines_updated,omitempty"`
	PropertyBedrooms   *int     `json:"property_bedrooms,omitempty"`
	PropertyBathrooms  *float64 `json:"property_bathrooms,omitempty"`
	RoomTiersApplied   bool     `json:"room_tiers_applied"`
}

func (p *Plugin) calculate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")
	var body struct {
		MarkupPercent float64 `json:"markup_percent"`
		TaxPercent    float64 `json:"tax_percent"`
	}
	_ = c.BodyParser(&body)

	var propertyID *string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT property_id::text FROM estimates WHERE id = $1 AND tenant_id = $2
	`, id, tid).Scan(&propertyID)
	if err != nil {
		return fiber.NewError(404, "not found")
	}

	result := CalculateResult{
		MarkupPercent: body.MarkupPercent,
		TaxPercent:    body.TaxPercent,
	}

	if propertyID != nil && *propertyID != "" {
		prop, err := p.loadEstimateProperty(c.UserContext(), tid, *propertyID)
		if err == nil && propertyHasRoomCounts(prop.Bedrooms, prop.Bathrooms) {
			result.PropertyBedrooms = prop.Bedrooms
			result.PropertyBathrooms = prop.Bathrooms
			updated, err := p.applyRoomBasedLinePricing(
				c.UserContext(), tid, id, *prop.Bedrooms, *prop.Bathrooms,
			)
			if err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "failed to apply room-based pricing")
			}
			result.TierLinesUpdated = updated
			result.RoomTiersApplied = updated > 0
		}
	}

	var subtotal int64
	err = p.pool.QueryRow(c.UserContext(), `
		SELECT COALESCE(SUM(ROUND(quantity * unit_price_cents)), 0)::bigint
		FROM estimate_line_items WHERE estimate_id = $1 AND tenant_id = $2
	`, id, tid).Scan(&subtotal)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to calculate estimate")
	}

	markupCents := int64(math.Round(float64(subtotal) * body.MarkupPercent / 100))
	taxable := subtotal + markupCents
	taxCents := int64(math.Round(float64(taxable) * body.TaxPercent / 100))
	total := taxable + taxCents
	_, err = p.pool.Exec(c.UserContext(), `
		UPDATE estimates SET subtotal_cents = $3, total_cents = $4, updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, id, tid, subtotal, total)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to calculate estimate")
	}

	result.SubtotalCents = subtotal
	result.MarkupCents = markupCents
	result.TaxCents = taxCents
	result.TotalCents = total
	return c.JSON(result)
}

func (p *Plugin) loadEstimateProperty(ctx context.Context, tid, propertyID string) (EstimateProperty, error) {
	var prop EstimateProperty
	var bedrooms *int
	var bathrooms *float64
	err := p.pool.QueryRow(ctx, `
		SELECT id::text, label, bedrooms, bathrooms
		FROM customer_properties
		WHERE id = $1 AND tenant_id = $2
	`, propertyID, tid).Scan(&prop.ID, &prop.Label, &bedrooms, &bathrooms)
	if err != nil {
		return EstimateProperty{}, err
	}
	prop.Bedrooms = bedrooms
	prop.Bathrooms = bathrooms
	return prop, nil
}

func (p *Plugin) validateEstimateProperty(ctx context.Context, tid, customerID, propertyID string) error {
	if propertyID == "" {
		return nil
	}
	if customerID == "" {
		return fiber.NewError(400, "customer required when linking a property")
	}
	var exists int
	err := p.pool.QueryRow(ctx, `
		SELECT 1 FROM customer_properties
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3
	`, propertyID, tid, customerID).Scan(&exists)
	if err != nil {
		return fiber.NewError(400, "property not found for customer")
	}
	return nil
}

func (p *Plugin) applyRoomBasedLinePricing(ctx context.Context, tid, estimateID string, bedrooms int, bathrooms float64) (int, error) {
	items, err := p.loadPriceBookItems(ctx, tid)
	if err != nil {
		return 0, err
	}
	byName := priceBookByName(items)

	rows, err := p.pool.Query(ctx, `
		SELECT id, description, quantity, unit_price_cents
		FROM estimate_line_items WHERE estimate_id = $1 AND tenant_id = $2
	`, estimateID, tid)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	updated := 0
	for rows.Next() {
		var lineID, description string
		var quantity float64
		var unitPriceCents int64
		if err := rows.Scan(&lineID, &description, &quantity, &unitPriceCents); err != nil {
			return updated, err
		}
		item, ok := byName[strings.ToLower(strings.TrimSpace(description))]
		if !ok || item.PricingModel != "room_based" {
			continue
		}
		newPrice := ResolveRoomBasedUnitPrice(item, bedrooms, bathrooms)
		if newPrice == unitPriceCents {
			continue
		}
		_, err := p.pool.Exec(ctx, `
			UPDATE estimate_line_items SET unit_price_cents = $3
			WHERE id = $1 AND tenant_id = $2
		`, lineID, tid, newPrice)
		if err != nil {
			return updated, err
		}
		updated++
	}
	return updated, rows.Err()
}

func (p *Plugin) loadPriceBookItems(ctx context.Context, tid string) ([]PriceBookItem, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT id, name, category, unit, unit_price_cents, pricing_model, pricing_tiers
		FROM price_book_items WHERE tenant_id = $1
	`, tid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PriceBookItem
	for rows.Next() {
		var item PriceBookItem
		var tiersJSON []byte
		if err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.Unit, &item.UnitPriceCents, &item.PricingModel, &tiersJSON); err != nil {
			return nil, err
		}
		items = append(items, scanPriceBookItem(item.ID, item.Name, item.Category, item.Unit, item.UnitPriceCents, item.PricingModel, tiersJSON))
	}
	return items, rows.Err()
}

func (p *Plugin) sendQuote(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	token := newPublicToken()
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE estimates
		SET status = 'sent', public_token = $3, updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
	`, c.Params("id"), tid, token)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(400, "cannot send")
	}
	return p.get(c)
}

func (p *Plugin) accept(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE estimates SET status = 'accepted', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = 'sent'
	`, id, tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(400, "cannot accept")
	}
	_ = p.bus.Publish(c.UserContext(), tid, "estimating.quote.accepted", map[string]string{"estimate_id": id})
	return c.JSON(fiber.Map{"status": "accepted", "estimate_id": id})
}

type PriceBookTier struct {
	Beds       int     `json:"beds"`
	Baths      float64 `json:"baths"`
	PriceCents int64   `json:"price_cents"`
}

type PriceBookItem struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Category       string          `json:"category"`
	Unit           string          `json:"unit"`
	UnitPriceCents int64           `json:"unit_price_cents"`
	PricingModel   string          `json:"pricing_model"`
	PricingTiers   []PriceBookTier `json:"pricing_tiers"`
}

func scanPriceBookItem(id, name, category, unit string, unitPriceCents int64, pricingModel string, tiersJSON []byte) PriceBookItem {
	item := PriceBookItem{
		ID: id, Name: name, Category: category, Unit: unit,
		UnitPriceCents: unitPriceCents, PricingModel: pricingModel,
	}
	if len(tiersJSON) > 0 {
		_ = json.Unmarshal(tiersJSON, &item.PricingTiers)
	}
	if item.PricingTiers == nil {
		item.PricingTiers = []PriceBookTier{}
	}
	if item.PricingModel == "" {
		item.PricingModel = "flat"
	}
	return item
}

func normalizePricingModel(model string) string {
	if model == "room_based" {
		return "room_based"
	}
	return "flat"
}

func (p *Plugin) listPriceBook(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, name, category, unit, unit_price_cents, pricing_model, pricing_tiers
		FROM price_book_items WHERE tenant_id = $1 ORDER BY name
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list price book items")
	}
	defer rows.Close()
	var list []PriceBookItem
	for rows.Next() {
		var item PriceBookItem
		var tiersJSON []byte
		_ = rows.Scan(&item.ID, &item.Name, &item.Category, &item.Unit, &item.UnitPriceCents, &item.PricingModel, &tiersJSON)
		list = append(list, scanPriceBookItem(item.ID, item.Name, item.Category, item.Unit, item.UnitPriceCents, item.PricingModel, tiersJSON))
	}
	return response.DataList(c, list)
}

func (p *Plugin) createPriceBook(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name           string          `json:"name"`
		Category       string          `json:"category"`
		Unit           string          `json:"unit"`
		UnitPriceCents int64           `json:"unit_price_cents"`
		PricingModel   string          `json:"pricing_model"`
		PricingTiers   []PriceBookTier `json:"pricing_tiers"`
	}
	if err := c.BodyParser(&body); err != nil || body.Name == "" {
		return fiber.NewError(400, "name required")
	}
	if body.Category == "" {
		body.Category = "service"
	}
	if body.Unit == "" {
		body.Unit = "each"
	}
	pricingModel := normalizePricingModel(body.PricingModel)
	if body.PricingTiers == nil {
		body.PricingTiers = []PriceBookTier{}
	}
	tiersJSON, err := json.Marshal(body.PricingTiers)
	if err != nil {
		return fiber.NewError(400, "invalid pricing tiers")
	}
	id := uuid.New().String()
	_, err = p.pool.Exec(c.UserContext(), `
		INSERT INTO price_book_items (id, tenant_id, name, category, unit, unit_price_cents, pricing_model, pricing_tiers)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, id, tid, body.Name, body.Category, body.Unit, body.UnitPriceCents, pricingModel, tiersJSON)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create price book item")
	}
	return c.Status(201).JSON(PriceBookItem{
		ID: id, Name: body.Name, Category: body.Category, Unit: body.Unit,
		UnitPriceCents: body.UnitPriceCents, PricingModel: pricingModel, PricingTiers: body.PricingTiers,
	})
}

func (p *Plugin) getPriceBook(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var item PriceBookItem
	var tiersJSON []byte
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, name, category, unit, unit_price_cents, pricing_model, pricing_tiers
		FROM price_book_items WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&item.ID, &item.Name, &item.Category, &item.Unit, &item.UnitPriceCents, &item.PricingModel, &tiersJSON)
	if err != nil {
		return fiber.NewError(404, "not found")
	}
	return c.JSON(scanPriceBookItem(item.ID, item.Name, item.Category, item.Unit, item.UnitPriceCents, item.PricingModel, tiersJSON))
}

func (p *Plugin) updatePriceBook(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name           *string          `json:"name"`
		Category       *string          `json:"category"`
		Unit           *string          `json:"unit"`
		UnitPriceCents *int64           `json:"unit_price_cents"`
		PricingModel   *string          `json:"pricing_model"`
		PricingTiers   *[]PriceBookTier `json:"pricing_tiers"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	var pricingModel *string
	if body.PricingModel != nil {
		normalized := normalizePricingModel(*body.PricingModel)
		pricingModel = &normalized
	}
	var tiersJSON []byte
	if body.PricingTiers != nil {
		var err error
		tiersJSON, err = json.Marshal(*body.PricingTiers)
		if err != nil {
			return fiber.NewError(400, "invalid pricing tiers")
		}
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE price_book_items SET
			name = COALESCE($3, name),
			category = COALESCE($4, category),
			unit = COALESCE($5, unit),
			unit_price_cents = COALESCE($6, unit_price_cents),
			pricing_model = COALESCE($7, pricing_model),
			pricing_tiers = COALESCE($8::jsonb, pricing_tiers)
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Name, body.Category, body.Unit, body.UnitPriceCents, pricingModel, nullableJSONB(tiersJSON))
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "not found")
	}
	return p.getPriceBook(c)
}

func nullableJSONB(data []byte) any {
	if data == nil {
		return nil
	}
	return data
}

func (p *Plugin) deletePriceBook(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `
		DELETE FROM price_book_items WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "not found")
	}
	return c.SendStatus(204)
}

func (p *Plugin) importPriceBook(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		CSVContent string `json:"csv_content"`
	}
	if err := c.BodyParser(&body); err != nil || strings.TrimSpace(body.CSVContent) == "" {
		return fiber.NewError(400, "csv_content required")
	}

	items, parseSkipped, err := parsePriceBookCSV(body.CSVContent)
	if err != nil {
		return fiber.NewError(400, err.Error())
	}

	accepted := 0
	insertSkipped := 0
	for _, item := range items {
		id := uuid.New().String()
		_, err := p.pool.Exec(c.UserContext(), `
			INSERT INTO price_book_items (id, tenant_id, name, category, unit, unit_price_cents)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, id, tid, item.Name, item.Category, item.Unit, item.UnitPriceCents)
		if err != nil {
			insertSkipped++
			continue
		}
		accepted++
	}

	skipped := parseSkipped + insertSkipped
	status := "imported"
	message := fmt.Sprintf("Imported %d price book item(s)", accepted)
	if accepted == 0 {
		status = "failed"
		message = "No rows were imported; check CSV format and column headers"
	}

	return c.JSON(fiber.Map{
		"status":        status,
		"message":       message,
		"accepted_rows": accepted,
		"skipped_rows":  skipped,
	})
}

type TakeoffRoom struct {
	Name string  `json:"name"`
	Sqft float64 `json:"sqft"`
}

type TakeoffMeasurement struct {
	ID        string        `json:"id"`
	Label     string        `json:"label"`
	TotalSqft float64       `json:"total_sqft"`
	Rooms     []TakeoffRoom `json:"rooms"`
	CreatedAt time.Time     `json:"created_at"`
}

func (p *Plugin) listTakeoff(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, label, total_sqft, rooms, created_at
		FROM takeoff_measurements WHERE tenant_id = $1 ORDER BY created_at DESC
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list takeoff measurements")
	}
	defer rows.Close()
	var list []TakeoffMeasurement
	for rows.Next() {
		var t TakeoffMeasurement
		var roomsJSON []byte
		_ = rows.Scan(&t.ID, &t.Label, &t.TotalSqft, &roomsJSON, &t.CreatedAt)
		_ = json.Unmarshal(roomsJSON, &t.Rooms)
		if t.Rooms == nil {
			t.Rooms = []TakeoffRoom{}
		}
		list = append(list, t)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createTakeoff(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Label string        `json:"label"`
		Rooms []TakeoffRoom `json:"rooms"`
	}
	if err := c.BodyParser(&body); err != nil || body.Label == "" {
		return fiber.NewError(400, "label required")
	}
	var total float64
	for _, r := range body.Rooms {
		total += r.Sqft
	}
	roomsJSON, _ := json.Marshal(body.Rooms)
	id := uuid.New().String()
	_, err := p.pool.Exec(c.UserContext(), `
		INSERT INTO takeoff_measurements (id, tenant_id, label, total_sqft, rooms)
		VALUES ($1, $2, $3, $4, $5)
	`, id, tid, body.Label, total, roomsJSON)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create takeoff measurement")
	}
	return c.Status(201).JSON(TakeoffMeasurement{
		ID: id, Label: body.Label, TotalSqft: total, Rooms: body.Rooms, CreatedAt: time.Now(),
	})
}

func (p *Plugin) getTakeoff(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var t TakeoffMeasurement
	var roomsJSON []byte
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, label, total_sqft, rooms, created_at
		FROM takeoff_measurements WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&t.ID, &t.Label, &t.TotalSqft, &roomsJSON, &t.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "not found")
	}
	_ = json.Unmarshal(roomsJSON, &t.Rooms)
	if t.Rooms == nil {
		t.Rooms = []TakeoffRoom{}
	}
	return c.JSON(t)
}
