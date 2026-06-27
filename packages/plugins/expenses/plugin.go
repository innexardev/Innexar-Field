package expenses

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
		ID:            "expenses",
		Name:          "Expenses",
		Version:       "1.0.0",
		Dependencies:  []string{"scheduling"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"expenses.read", "expenses.write"},
		Nav: []plugin.NavItem{
			{Label: "Expenses", Path: "/expenses", Icon: "wallet"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/expenses", p.list)
	router.Post("/expenses", p.create)
	router.Post("/expenses/receipt-scan", p.scanReceipt)
	router.Get("/expenses/:id", p.get)
	router.Patch("/expenses/:id", p.update)
	router.Delete("/expenses/:id", p.delete)
	router.Post("/expenses/:id/approve", middleware.RequireRole("admin", "accountant"), p.approve)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{{Version: 150, Name: "expenses", UpSQL: expensesSQL}}
}

const expensesSQL = `
CREATE TABLE IF NOT EXISTS expenses (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	job_id UUID,
	description TEXT NOT NULL,
	amount_cents BIGINT NOT NULL DEFAULT 0,
	category TEXT NOT NULL DEFAULT 'general',
	status TEXT NOT NULL DEFAULT 'pending',
	expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_job ON expenses (tenant_id, job_id);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS expenses_tenant ON expenses;
CREATE POLICY expenses_tenant ON expenses
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type Expense struct {
	ID          string    `json:"id"`
	JobID       string    `json:"job_id,omitempty"`
	Description string    `json:"description"`
	AmountCents int64     `json:"amount_cents"`
	Category    string    `json:"category"`
	Status      string    `json:"status"`
	ExpenseDate string    `json:"expense_date"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (p *Plugin) list(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	jobFilter := c.Query("job_id")
	query := `
		SELECT id, COALESCE(job_id::text,''), description, amount_cents, category, status,
			expense_date::text, created_at, updated_at
		FROM expenses WHERE tenant_id = $1
	`
	args := []interface{}{tid}
	if jobFilter != "" {
		query += ` AND job_id = $2::uuid`
		args = append(args, jobFilter)
	}
	query += ` ORDER BY expense_date DESC, created_at DESC`
	if jobFilter == "" {
		query += ` LIMIT 100`
	}
	rows, err := p.pool.Query(c.UserContext(), query, args...)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list expenses")
	}
	defer rows.Close()

	var list []Expense
	for rows.Next() {
		var e Expense
		if err := rows.Scan(&e.ID, &e.JobID, &e.Description, &e.AmountCents, &e.Category, &e.Status, &e.ExpenseDate, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return err
		}
		list = append(list, e)
	}
	return response.DataList(c, list)
}

func (p *Plugin) create(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		JobID       string `json:"job_id"`
		Description string `json:"description"`
		AmountCents int64  `json:"amount_cents"`
		Category    string `json:"category"`
		ExpenseDate string `json:"expense_date"`
	}
	if err := c.BodyParser(&body); err != nil || body.Description == "" {
		return fiber.NewError(400, "description required")
	}
	if body.Category == "" {
		body.Category = "general"
	}
	if body.ExpenseDate == "" {
		body.ExpenseDate = time.Now().Format("2006-01-02")
	}
	id := uuid.New().String()
	var createdAt, updatedAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO expenses (id, tenant_id, job_id, description, amount_cents, category, expense_date)
		VALUES ($1, $2, NULLIF($3,'')::uuid, $4, $5, $6, $7::date)
		RETURNING created_at, updated_at
	`, id, tid, body.JobID, body.Description, body.AmountCents, body.Category, body.ExpenseDate).Scan(&createdAt, &updatedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create expense")
	}
	return c.Status(201).JSON(Expense{
		ID: id, JobID: body.JobID, Description: body.Description, AmountCents: body.AmountCents,
		Category: body.Category, Status: "pending", ExpenseDate: body.ExpenseDate,
		CreatedAt: createdAt, UpdatedAt: updatedAt,
	})
}

func (p *Plugin) get(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var e Expense
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(job_id::text,''), description, amount_cents, category, status,
			expense_date::text, created_at, updated_at
		FROM expenses WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&e.ID, &e.JobID, &e.Description, &e.AmountCents, &e.Category, &e.Status, &e.ExpenseDate, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return fiber.NewError(404, "expense not found")
	}
	return c.JSON(e)
}

func (p *Plugin) update(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		JobID       *string `json:"job_id"`
		Description *string `json:"description"`
		AmountCents *int64  `json:"amount_cents"`
		Category    *string `json:"category"`
		ExpenseDate *string `json:"expense_date"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE expenses SET
			job_id = COALESCE(NULLIF($3,'')::uuid, job_id),
			description = COALESCE($4, description),
			amount_cents = COALESCE($5, amount_cents),
			category = COALESCE($6, category),
			expense_date = COALESCE($7::date, expense_date),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
	`, c.Params("id"), tid, body.JobID, body.Description, body.AmountCents, body.Category, body.ExpenseDate)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "expense not found or not editable")
	}
	return p.get(c)
}

func (p *Plugin) delete(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `
		DELETE FROM expenses WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
	`, c.Params("id"), tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "expense not found or not deletable")
	}
	return c.SendStatus(204)
}

func (p *Plugin) approve(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE expenses SET status = 'approved', updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
	`, id, tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(400, "cannot approve")
	}
	_ = p.bus.Publish(c.UserContext(), tid, "financial.expense.approved", map[string]string{"expense_id": id})
	return p.get(c)
}
