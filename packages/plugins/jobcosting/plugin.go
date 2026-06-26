package jobcosting

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Plugin {
	return &Plugin{pool: pool}
}

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "job-costing",
		Name:          "Job Costing",
		Version:       "1.0.0",
		Dependencies:  []string{"scheduling"},
		IndustryPacks: []string{"construction", "field-services"},
		Permissions:   []string{"job-costing.read", "job-costing.write"},
		Nav: []plugin.NavItem{
			{Label: "Job Costing", Path: "/job-costing", Icon: "calculator"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/job-costs", p.list)
	router.Post("/job-costs", p.create)
	router.Get("/job-costs/:id", p.get)
	router.Patch("/job-costs/:id", p.update)
	router.Delete("/job-costs/:id", p.delete)
	router.Get("/jobs/:job_id/summary", p.jobSummary)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{{Version: 160, Name: "job_costing", UpSQL: jobCostingSQL}}
}

const jobCostingSQL = `
CREATE TABLE IF NOT EXISTS job_cost_lines (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	job_id UUID NOT NULL,
	cost_code TEXT NOT NULL DEFAULT 'general',
	description TEXT NOT NULL DEFAULT '',
	budget_cents BIGINT NOT NULL DEFAULT 0,
	actual_cents BIGINT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_cost_lines_tenant ON job_cost_lines (tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_cost_lines_job ON job_cost_lines (tenant_id, job_id);
ALTER TABLE job_cost_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cost_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_cost_lines_tenant ON job_cost_lines;
CREATE POLICY job_cost_lines_tenant ON job_cost_lines
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type JobCostLine struct {
	ID          string    `json:"id"`
	JobID       string    `json:"job_id"`
	CostCode    string    `json:"cost_code"`
	Description string    `json:"description"`
	BudgetCents int64     `json:"budget_cents"`
	ActualCents int64     `json:"actual_cents"`
	VarianceCents int64   `json:"variance_cents"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type JobSummary struct {
	JobID         string `json:"job_id"`
	TotalBudget   int64  `json:"total_budget_cents"`
	TotalActual   int64  `json:"total_actual_cents"`
	TotalVariance int64  `json:"total_variance_cents"`
	LineCount     int    `json:"line_count"`
}

func (p *Plugin) list(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	jobFilter := c.Query("job_id")
	query := `
		SELECT id, job_id, cost_code, description, budget_cents, actual_cents, created_at, updated_at
		FROM job_cost_lines WHERE tenant_id = $1
	`
	args := []interface{}{tid}
	if jobFilter != "" {
		query += ` AND job_id = $2::uuid ORDER BY cost_code, created_at`
		args = append(args, jobFilter)
	} else {
		query += ` ORDER BY created_at DESC LIMIT 100`
	}
	rows, err := p.pool.Query(c.UserContext(), query, args...)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list job cost lines")
	}
	defer rows.Close()

	var list []JobCostLine
	for rows.Next() {
		var line JobCostLine
		if err := rows.Scan(&line.ID, &line.JobID, &line.CostCode, &line.Description, &line.BudgetCents, &line.ActualCents, &line.CreatedAt, &line.UpdatedAt); err != nil {
			return err
		}
		line.VarianceCents = line.BudgetCents - line.ActualCents
		list = append(list, line)
	}
	return response.DataList(c, list)
}

func (p *Plugin) create(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		JobID       string `json:"job_id"`
		CostCode    string `json:"cost_code"`
		Description string `json:"description"`
		BudgetCents int64  `json:"budget_cents"`
		ActualCents int64  `json:"actual_cents"`
	}
	if err := c.BodyParser(&body); err != nil || body.JobID == "" {
		return fiber.NewError(400, "job_id required")
	}
	if body.CostCode == "" {
		body.CostCode = "general"
	}
	id := uuid.New().String()
	var createdAt, updatedAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO job_cost_lines (id, tenant_id, job_id, cost_code, description, budget_cents, actual_cents)
		VALUES ($1, $2, $3::uuid, $4, $5, $6, $7)
		RETURNING created_at, updated_at
	`, id, tid, body.JobID, body.CostCode, body.Description, body.BudgetCents, body.ActualCents).Scan(&createdAt, &updatedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create job cost line")
	}
	return c.Status(201).JSON(JobCostLine{
		ID: id, JobID: body.JobID, CostCode: body.CostCode, Description: body.Description,
		BudgetCents: body.BudgetCents, ActualCents: body.ActualCents,
		VarianceCents: body.BudgetCents - body.ActualCents,
		CreatedAt: createdAt, UpdatedAt: updatedAt,
	})
}

func (p *Plugin) get(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var line JobCostLine
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, job_id, cost_code, description, budget_cents, actual_cents, created_at, updated_at
		FROM job_cost_lines WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&line.ID, &line.JobID, &line.CostCode, &line.Description, &line.BudgetCents, &line.ActualCents, &line.CreatedAt, &line.UpdatedAt)
	if err != nil {
		return fiber.NewError(404, "job cost line not found")
	}
	line.VarianceCents = line.BudgetCents - line.ActualCents
	return c.JSON(line)
}

func (p *Plugin) update(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		CostCode    *string `json:"cost_code"`
		Description *string `json:"description"`
		BudgetCents *int64  `json:"budget_cents"`
		ActualCents *int64  `json:"actual_cents"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE job_cost_lines SET
			cost_code = COALESCE($3, cost_code),
			description = COALESCE($4, description),
			budget_cents = COALESCE($5, budget_cents),
			actual_cents = COALESCE($6, actual_cents),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.CostCode, body.Description, body.BudgetCents, body.ActualCents)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "job cost line not found")
	}
	return p.get(c)
}

func (p *Plugin) delete(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `
		DELETE FROM job_cost_lines WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "job cost line not found")
	}
	return c.SendStatus(204)
}

func (p *Plugin) jobSummary(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	jobID := c.Params("job_id")
	var summary JobSummary
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT
			COALESCE(SUM(budget_cents), 0),
			COALESCE(SUM(actual_cents), 0),
			COUNT(*)
		FROM job_cost_lines
		WHERE tenant_id = $1 AND job_id = $2::uuid
	`, tid, jobID).Scan(&summary.TotalBudget, &summary.TotalActual, &summary.LineCount)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load job summary")
	}
	summary.JobID = jobID
	summary.TotalVariance = summary.TotalBudget - summary.TotalActual
	return c.JSON(summary)
}
