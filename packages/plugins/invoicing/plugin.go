package invoicing

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/events"
	"github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct {
	pool *pgxpool.Pool
	bus  *events.Bus
}

func New(pool *pgxpool.Pool, bus *events.Bus) *Plugin {
	return &Plugin{pool: pool, bus: bus}
}

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "invoicing",
		Name:          "Invoicing",
		Version:       "1.0.0",
		Dependencies:  []string{"crm"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"invoicing.read", "invoicing.write"},
		Nav: []plugin.NavItem{
			{Label: "Invoices", Path: "/invoices", Icon: "receipt"},
			{Label: "Payments", Path: "/payments", Icon: "wallet"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/invoices", p.list)
	router.Post("/invoices", p.create)
	router.Get("/invoices/:id", p.get)
	router.Post("/invoices/:id/send", p.send)
	router.Post("/invoices/:id/pay", middleware.RequireRole("admin", "accountant"), p.pay)
	router.Get("/payments", p.listPayments)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 130, Name: "invoices", UpSQL: invoicesSQL},
		{Version: 131, Name: "idempotency_keys", UpSQL: idempotencySQL},
	}
}

const invoicesSQL = `
CREATE TABLE IF NOT EXISTS invoices (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID,
	job_id UUID,
	invoice_number TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	total_cents BIGINT NOT NULL DEFAULT 0,
	due_at TIMESTAMPTZ,
	paid_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_tenant ON invoices;
CREATE POLICY invoices_tenant ON invoices USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const idempotencySQL = `
CREATE TABLE IF NOT EXISTS idempotency_keys (
	key TEXT NOT NULL,
	tenant_id UUID NOT NULL,
	response JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (tenant_id, key)
);
`

type Invoice struct {
	ID            string     `json:"id"`
	CustomerID    string     `json:"customer_id,omitempty"`
	JobID         string     `json:"job_id,omitempty"`
	InvoiceNumber string     `json:"invoice_number"`
	Status        string     `json:"status"`
	TotalCents    int64      `json:"total_cents"`
	DueAt         *time.Time `json:"due_at,omitempty"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

func (p *Plugin) list(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), COALESCE(job_id::text,''), invoice_number, status, total_cents, due_at, paid_at, created_at
		FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list invoices")
	}
	defer rows.Close()
	var list []Invoice
	for rows.Next() {
		var inv Invoice
		_ = rows.Scan(&inv.ID, &inv.CustomerID, &inv.JobID, &inv.InvoiceNumber, &inv.Status, &inv.TotalCents, &inv.DueAt, &inv.PaidAt, &inv.CreatedAt)
		list = append(list, inv)
	}
	return response.DataList(c, list)
}

func (p *Plugin) create(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		CustomerID string `json:"customer_id"`
		JobID      string `json:"job_id"`
		TotalCents int64  `json:"total_cents"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	id := uuid.New().String()
	num := "INV-" + id[:8]
	_, err := p.pool.Exec(c.UserContext(), `
		INSERT INTO invoices (id, tenant_id, customer_id, job_id, invoice_number, total_cents, due_at)
		VALUES ($1, $2, NULLIF($3,'')::uuid, NULLIF($4,'')::uuid, $5, $6, NOW() + INTERVAL '30 days')
	`, id, tid, body.CustomerID, body.JobID, num, body.TotalCents)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create invoice")
	}
	return c.Status(201).JSON(Invoice{ID: id, InvoiceNumber: num, Status: "draft", TotalCents: body.TotalCents})
}

func (p *Plugin) get(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var inv Invoice
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), COALESCE(job_id::text,''), invoice_number, status, total_cents, due_at, paid_at, created_at
		FROM invoices WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&inv.ID, &inv.CustomerID, &inv.JobID, &inv.InvoiceNumber, &inv.Status, &inv.TotalCents, &inv.DueAt, &inv.PaidAt, &inv.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "not found")
	}
	return c.JSON(inv)
}

func (p *Plugin) send(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE invoices SET status = 'sent' WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
	`, c.Params("id"), tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(400, "cannot send")
	}
	return p.get(c)
}

func (p *Plugin) pay(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = 'sent'
	`, id, tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(400, "cannot pay")
	}
	_ = p.bus.Publish(c.UserContext(), tid, "financial.invoice.paid", map[string]string{"invoice_id": id})
	return c.JSON(fiber.Map{"status": "paid", "invoice_id": id})
}

type Payment struct {
	ID            string     `json:"id"`
	InvoiceID     string     `json:"invoice_id,omitempty"`
	InvoiceNumber string     `json:"invoice_number,omitempty"`
	AmountCents   int64      `json:"amount_cents"`
	Status        string     `json:"status"`
	Method        string     `json:"method,omitempty"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

func (p *Plugin) listPayments(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, invoice_number, total_cents, status, paid_at, created_at
		FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list payments")
	}
	defer rows.Close()
	var list []Payment
	for rows.Next() {
		var invID, num, status string
		var total int64
		var paidAt *time.Time
		var createdAt time.Time
		_ = rows.Scan(&invID, &num, &total, &status, &paidAt, &createdAt)
		payStatus := "pending"
		if status == "paid" {
			payStatus = "received"
		} else if status == "sent" {
			payStatus = "pending"
		} else {
			continue
		}
		list = append(list, Payment{
			ID:            invID,
			InvoiceID:     invID,
			InvoiceNumber: num,
			AmountCents:   total,
			Status:        payStatus,
			Method:        "card",
			PaidAt:        paidAt,
			CreatedAt:     createdAt,
		})
	}
	if len(list) == 0 {
		list = []Payment{}
	}
	return response.DataList(c, list)
}
