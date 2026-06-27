package crm

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Plugin { return &Plugin{pool: pool} }

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "crm",
		Name:          "CRM",
		Version:       "1.0.0",
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"crm.read", "crm.write"},
		Nav: []plugin.NavItem{
			{Label: "Customers", Path: "/customers", Icon: "users"},
			{Label: "Leads", Path: "/leads", Icon: "user-plus"},
			{Label: "Contracts", Path: "/contracts", Icon: "file-text"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/customers", p.listCustomers)
	router.Post("/customers", p.createCustomer)
	router.Get("/customers/:id/properties", p.listCustomerProperties)
	router.Post("/customers/:id/properties", p.createCustomerProperty)
	router.Patch("/customers/:id/properties/:propertyId", p.updateCustomerProperty)
	router.Get("/customers/:id", p.getCustomer)
	router.Patch("/customers/:id", p.updateCustomer)
	router.Get("/leads", p.listLeads)
	router.Get("/leads/board", p.getLeadsBoard)
	router.Post("/leads", p.createLead)
	router.Get("/leads/:id", p.getLead)
	router.Patch("/leads/:id", p.updateLead)
	router.Get("/contracts", p.listContracts)
	router.Post("/contracts", p.createContract)
	router.Get("/contracts/templates", p.listContractTemplates)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 100, Name: "crm_customers", UpSQL: customersSQL},
		{Version: 101, Name: "crm_leads", UpSQL: leadsSQL},
		{Version: 102, Name: "crm_properties", UpSQL: propertiesSQL},
		{Version: 103, Name: "crm_contracts", UpSQL: contractsSQL},
		{Version: 104, Name: "crm_contract_templates", UpSQL: contractTemplatesSQL},
		{Version: 105, Name: "crm_property_beds_baths_sqft", UpSQL: propertyBedsBathsSqftSQL},
		{Version: 106, Name: "crm_contracts_terms", UpSQL: contractsTermsSQL},
	}
}

const customersSQL = `
CREATE TABLE IF NOT EXISTS customers (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	name TEXT NOT NULL,
	email TEXT,
	phone TEXT,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers (tenant_id);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_tenant ON customers;
CREATE POLICY customers_tenant ON customers
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const leadsSQL = `
CREATE TABLE IF NOT EXISTS leads (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	name TEXT NOT NULL,
	email TEXT,
	phone TEXT,
	source TEXT DEFAULT 'web',
	status TEXT NOT NULL DEFAULT 'new',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_tenant ON leads;
CREATE POLICY leads_tenant ON leads
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const propertiesSQL = `
CREATE TABLE IF NOT EXISTS customer_properties (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
	label TEXT NOT NULL,
	street TEXT NOT NULL DEFAULT '',
	city TEXT NOT NULL DEFAULT '',
	state TEXT NOT NULL DEFAULT '',
	zip TEXT NOT NULL DEFAULT '',
	is_primary BOOLEAN NOT NULL DEFAULT false,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_properties_tenant ON customer_properties (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_properties_customer ON customer_properties (tenant_id, customer_id);
ALTER TABLE customer_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_properties FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_properties_tenant ON customer_properties;
CREATE POLICY customer_properties_tenant ON customer_properties
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const propertyBedsBathsSqftSQL = `
ALTER TABLE customer_properties ADD COLUMN IF NOT EXISTS bedrooms INT;
ALTER TABLE customer_properties ADD COLUMN IF NOT EXISTS bathrooms NUMERIC;
ALTER TABLE customer_properties ADD COLUMN IF NOT EXISTS sqft INT;
`

const contractsSQL = `
CREATE TABLE IF NOT EXISTS contracts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID,
	title TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	amount_cents BIGINT NOT NULL DEFAULT 0,
	starts_at DATE,
	ends_at DATE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts (tenant_id);
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contracts_tenant ON contracts;
CREATE POLICY contracts_tenant ON contracts
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const contractsTermsSQL = `
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS terms TEXT NOT NULL DEFAULT '';
`

const contractTemplatesSQL = `
CREATE TABLE IF NOT EXISTS contract_templates (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	slug TEXT NOT NULL,
	name_key TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT 'general',
	body TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_contract_templates_tenant ON contract_templates (tenant_id);
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contract_templates_tenant ON contract_templates;
CREATE POLICY contract_templates_tenant ON contract_templates
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type Customer struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email,omitempty"`
	Phone     string    `json:"phone,omitempty"`
	Notes     string    `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func (p *Plugin) listCustomers(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, name, email, phone, notes, created_at FROM customers
		WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list customers")
	}
	defer rows.Close()

	var list []Customer
	for rows.Next() {
		var cu Customer
		if err := rows.Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Phone, &cu.Notes, &cu.CreatedAt); err != nil {
			return err
		}
		list = append(list, cu)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createCustomer(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Phone string `json:"phone"`
		Notes string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil || body.Name == "" {
		return fiber.NewError(400, "name required")
	}
	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO customers (id, tenant_id, name, email, phone, notes)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING created_at
	`, id, tid, body.Name, body.Email, body.Phone, body.Notes).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create customer")
	}
	return c.Status(201).JSON(Customer{ID: id, Name: body.Name, Email: body.Email, Phone: body.Phone, Notes: body.Notes, CreatedAt: createdAt})
}

func (p *Plugin) getCustomer(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var cu Customer
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, name, email, phone, notes, created_at FROM customers
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&cu.ID, &cu.Name, &cu.Email, &cu.Phone, &cu.Notes, &cu.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "customer not found")
	}
	return c.JSON(cu)
}

func (p *Plugin) updateCustomer(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name  *string `json:"name"`
		Email *string `json:"email"`
		Phone *string `json:"phone"`
		Notes *string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE customers SET
			name = COALESCE($3, name),
			email = COALESCE($4, email),
			phone = COALESCE($5, phone),
			notes = COALESCE($6, notes),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Name, body.Email, body.Phone, body.Notes)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "customer not found")
	}
	return p.getCustomer(c)
}

type Lead struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email,omitempty"`
	Phone  string `json:"phone,omitempty"`
	Source string `json:"source"`
	Status string `json:"status"`
}

func (p *Plugin) listLeads(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, name, email, phone, source, status FROM leads WHERE tenant_id = $1
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list leads")
	}
	defer rows.Close()
	var list []Lead
	for rows.Next() {
		var l Lead
		_ = rows.Scan(&l.ID, &l.Name, &l.Email, &l.Phone, &l.Source, &l.Status)
		list = append(list, l)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createLead(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name   string `json:"name"`
		Email  string `json:"email"`
		Phone  string `json:"phone"`
		Source string `json:"source"`
	}
	if err := c.BodyParser(&body); err != nil || body.Name == "" {
		return fiber.NewError(400, "name required")
	}
	if body.Source == "" {
		body.Source = "web"
	}
	id := uuid.New().String()
	_, err := p.pool.Exec(c.UserContext(), `
		INSERT INTO leads (id, tenant_id, name, email, phone, source) VALUES ($1,$2,$3,$4,$5,$6)
	`, id, tid, body.Name, body.Email, body.Phone, body.Source)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create lead")
	}
	return c.Status(201).JSON(Lead{ID: id, Name: body.Name, Email: body.Email, Phone: body.Phone, Source: body.Source, Status: "new"})
}

func (p *Plugin) getLead(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var l Lead
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, name, email, phone, source, status FROM leads
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&l.ID, &l.Name, &l.Email, &l.Phone, &l.Source, &l.Status)
	if err != nil {
		return fiber.NewError(404, "lead not found")
	}
	return c.JSON(l)
}

func (p *Plugin) updateLead(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name   *string `json:"name"`
		Email  *string `json:"email"`
		Phone  *string `json:"phone"`
		Source *string `json:"source"`
		Status *string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.Status != nil {
		switch *body.Status {
		case "new", "contacted", "qualified", "converted", "lost":
		default:
			return fiber.NewError(400, "status must be new, contacted, qualified, converted, or lost")
		}
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE leads SET
			name = COALESCE($3, name),
			email = COALESCE($4, email),
			phone = COALESCE($5, phone),
			source = COALESCE($6, source),
			status = COALESCE($7, status)
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Name, body.Email, body.Phone, body.Source, body.Status)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "lead not found")
	}
	return p.getLead(c)
}

type Contract struct {
	ID           string `json:"id"`
	CustomerID   string `json:"customer_id,omitempty"`
	CustomerName string `json:"customer_name,omitempty"`
	Title        string `json:"title"`
	Status       string `json:"status"`
	AmountCents  int64  `json:"amount_cents"`
	StartsAt     string `json:"starts_at,omitempty"`
	EndsAt       string `json:"ends_at,omitempty"`
	Terms        string `json:"terms,omitempty"`
}

func (p *Plugin) listContracts(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT c.id, COALESCE(c.customer_id::text,''), COALESCE(cu.name,''),
			c.title, c.status, c.amount_cents,
			COALESCE(c.starts_at::text,''), COALESCE(c.ends_at::text,''),
			COALESCE(c.terms, '')
		FROM contracts c
		LEFT JOIN customers cu ON cu.id = c.customer_id AND cu.tenant_id = c.tenant_id
		WHERE c.tenant_id = $1
		ORDER BY c.created_at DESC
		LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list contracts")
	}
	defer rows.Close()

	var list []Contract
	for rows.Next() {
		var ctr Contract
		if err := rows.Scan(&ctr.ID, &ctr.CustomerID, &ctr.CustomerName, &ctr.Title, &ctr.Status, &ctr.AmountCents, &ctr.StartsAt, &ctr.EndsAt, &ctr.Terms); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list contracts")
		}
		list = append(list, ctr)
	}
	if err := rows.Err(); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list contracts")
	}
	return response.DataList(c, list)
}

func (p *Plugin) createContract(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		CustomerID  string `json:"customer_id"`
		Title       string `json:"title"`
		Status      string `json:"status"`
		AmountCents int64  `json:"amount_cents"`
		StartsAt    string `json:"starts_at"`
		EndsAt      string `json:"ends_at"`
		Terms       string `json:"terms"`
	}
	if err := c.BodyParser(&body); err != nil || body.Title == "" {
		return fiber.NewError(400, "title required")
	}
	if body.Status == "" {
		body.Status = "draft"
	}
	id := uuid.New().String()
	_, err := p.pool.Exec(c.UserContext(), `
		INSERT INTO contracts (id, tenant_id, customer_id, title, status, amount_cents, starts_at, ends_at, terms)
		VALUES ($1, $2, NULLIF($3,'')::uuid, $4, $5, $6, NULLIF($7,'')::date, NULLIF($8,'')::date, $9)
	`, id, tid, body.CustomerID, body.Title, body.Status, body.AmountCents, body.StartsAt, body.EndsAt, body.Terms)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create contract")
	}
	return c.Status(201).JSON(Contract{
		ID: id, CustomerID: body.CustomerID, Title: body.Title,
		Status: body.Status, AmountCents: body.AmountCents, StartsAt: body.StartsAt, EndsAt: body.EndsAt,
		Terms: body.Terms,
	})
}

func (p *Plugin) listContractTemplates(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	if err := EnsureContractTemplates(c.UserContext(), p.pool, tid); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load contract templates")
	}

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, slug, name_key, category, body
		FROM contract_templates
		WHERE tenant_id = $1
		ORDER BY slug
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list contract templates")
	}
	defer rows.Close()

	var list []ContractTemplate
	for rows.Next() {
		var tmpl ContractTemplate
		if err := rows.Scan(&tmpl.ID, &tmpl.Slug, &tmpl.NameKey, &tmpl.Category, &tmpl.Body); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list contract templates")
		}
		list = append(list, tmpl)
	}
	return response.DataList(c, list)
}

var leadStatusOrder = []string{"new", "contacted", "qualified", "converted", "lost"}

type LeadBoardColumn struct {
	Status string `json:"status"`
	Leads  []Lead `json:"leads"`
	Count  int    `json:"count"`
}

func (p *Plugin) getLeadsBoard(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, name, email, COALESCE(phone, ''), source, status FROM leads
		WHERE tenant_id = $1 ORDER BY created_at DESC
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load leads board")
	}
	defer rows.Close()

	byStatus := make(map[string][]Lead)
	summary := make(map[string]int)
	for rows.Next() {
		var l Lead
		if err := rows.Scan(&l.ID, &l.Name, &l.Email, &l.Phone, &l.Source, &l.Status); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load leads board")
		}
		byStatus[l.Status] = append(byStatus[l.Status], l)
		summary[l.Status]++
	}

	columns := make([]LeadBoardColumn, 0, len(leadStatusOrder))
	for _, status := range leadStatusOrder {
		leads := byStatus[status]
		if leads == nil {
			leads = []Lead{}
		}
		columns = append(columns, LeadBoardColumn{
			Status: status,
			Leads:  leads,
			Count:  len(leads),
		})
	}

	all := make([]Lead, 0)
	for _, col := range columns {
		all = append(all, col.Leads...)
	}

	return c.JSON(fiber.Map{
		"data":    all,
		"columns": columns,
		"summary": summary,
	})
}

type Property struct {
	ID         string   `json:"id"`
	CustomerID string   `json:"customer_id"`
	Label      string   `json:"label"`
	Street     string   `json:"street"`
	City       string   `json:"city"`
	State      string   `json:"state"`
	Zip        string   `json:"zip"`
	IsPrimary  bool     `json:"is_primary"`
	Bedrooms   *int     `json:"bedrooms,omitempty"`
	Bathrooms  *float64 `json:"bathrooms,omitempty"`
	Sqft       *int     `json:"sqft,omitempty"`
}

const propertySelectCols = `
	id, customer_id::text, label, street, city, state, zip, is_primary, bedrooms, bathrooms, sqft
`

func scanProperty(row interface {
	Scan(dest ...any) error
}) (Property, error) {
	var prop Property
	err := row.Scan(
		&prop.ID, &prop.CustomerID, &prop.Label, &prop.Street, &prop.City, &prop.State, &prop.Zip,
		&prop.IsPrimary, &prop.Bedrooms, &prop.Bathrooms, &prop.Sqft,
	)
	return prop, err
}

func (p *Plugin) listCustomerProperties(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	customerID := c.Params("id")

	var exists int
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT 1 FROM customers WHERE id = $1 AND tenant_id = $2
	`, customerID, tid).Scan(&exists)
	if err != nil {
		return fiber.NewError(404, "customer not found")
	}

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT `+propertySelectCols+`
		FROM customer_properties
		WHERE tenant_id = $1 AND customer_id = $2
		ORDER BY is_primary DESC, label
	`, tid, customerID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list properties")
	}
	defer rows.Close()

	var list []Property
	for rows.Next() {
		prop, err := scanProperty(rows)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list properties")
		}
		list = append(list, prop)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createCustomerProperty(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	customerID := c.Params("id")

	var exists int
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT 1 FROM customers WHERE id = $1 AND tenant_id = $2
	`, customerID, tid).Scan(&exists)
	if err != nil {
		return fiber.NewError(404, "customer not found")
	}

	var body struct {
		Label     string   `json:"label"`
		Street    string   `json:"street"`
		City      string   `json:"city"`
		State     string   `json:"state"`
		Zip       string   `json:"zip"`
		IsPrimary bool     `json:"is_primary"`
		Bedrooms  *int     `json:"bedrooms"`
		Bathrooms *float64 `json:"bathrooms"`
		Sqft      *int     `json:"sqft"`
	}
	if err := c.BodyParser(&body); err != nil || body.Label == "" {
		return fiber.NewError(400, "label required")
	}

	id := uuid.New().String()
	if body.IsPrimary {
		_, _ = p.pool.Exec(c.UserContext(), `
			UPDATE customer_properties SET is_primary = false
			WHERE tenant_id = $1 AND customer_id = $2
		`, tid, customerID)
	}

	_, err = p.pool.Exec(c.UserContext(), `
		INSERT INTO customer_properties (
			id, tenant_id, customer_id, label, street, city, state, zip, is_primary, bedrooms, bathrooms, sqft
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, id, tid, customerID, body.Label, body.Street, body.City, body.State, body.Zip, body.IsPrimary,
		body.Bedrooms, body.Bathrooms, body.Sqft)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create property")
	}

	return c.Status(201).JSON(Property{
		ID: id, CustomerID: customerID, Label: body.Label,
		Street: body.Street, City: body.City, State: body.State, Zip: body.Zip, IsPrimary: body.IsPrimary,
		Bedrooms: body.Bedrooms, Bathrooms: body.Bathrooms, Sqft: body.Sqft,
	})
}

func (p *Plugin) updateCustomerProperty(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	customerID := c.Params("id")
	propertyID := c.Params("propertyId")

	var body struct {
		Label     *string  `json:"label"`
		Street    *string  `json:"street"`
		City      *string  `json:"city"`
		State     *string  `json:"state"`
		Zip       *string  `json:"zip"`
		IsPrimary *bool    `json:"is_primary"`
		Bedrooms  *int     `json:"bedrooms"`
		Bathrooms *float64 `json:"bathrooms"`
		Sqft      *int     `json:"sqft"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}

	if body.IsPrimary != nil && *body.IsPrimary {
		_, _ = p.pool.Exec(c.UserContext(), `
			UPDATE customer_properties SET is_primary = false
			WHERE tenant_id = $1 AND customer_id = $2
		`, tid, customerID)
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE customer_properties SET
			label = COALESCE($4, label),
			street = COALESCE($5, street),
			city = COALESCE($6, city),
			state = COALESCE($7, state),
			zip = COALESCE($8, zip),
			is_primary = COALESCE($9, is_primary),
			bedrooms = COALESCE($10, bedrooms),
			bathrooms = COALESCE($11, bathrooms),
			sqft = COALESCE($12, sqft)
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3
	`, propertyID, tid, customerID, body.Label, body.Street, body.City, body.State, body.Zip,
		body.IsPrimary, body.Bedrooms, body.Bathrooms, body.Sqft)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "property not found")
	}

	row := p.pool.QueryRow(c.UserContext(), `
		SELECT `+propertySelectCols+`
		FROM customer_properties
		WHERE id = $1 AND tenant_id = $2 AND customer_id = $3
	`, propertyID, tid, customerID)
	prop, err := scanProperty(row)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load property")
	}
	return c.JSON(prop)
}

