package construction

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
		ID:            "construction",
		Name:          "Construction",
		Version:       "1.0.0",
		Dependencies:  []string{"crm", "estimating"},
		IndustryPacks: []string{"construction"},
		Permissions:   []string{"construction.read", "construction.write"},
		Nav: []plugin.NavItem{
			{Label: "Projects", Path: "/projects", Icon: "building"},
			{Label: "Change Orders", Path: "/change-orders", Icon: "file-diff"},
			{Label: "Milestones", Path: "/milestones", Icon: "flag"},
			{Label: "Subcontractors", Path: "/subcontractors", Icon: "users"},
			{Label: "Permits", Path: "/permits", Icon: "shield"},
			{Label: "Lien Waivers", Path: "/lien-waivers", Icon: "file-text"},
			{Label: "RFIs", Path: "/rfis", Icon: "clipboard-list"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/projects", p.listProjects)
	router.Post("/projects", p.createProject)
	router.Get("/projects/:id/daily-logs", p.listDailyLogs)
	router.Post("/projects/:id/daily-logs", p.createDailyLog)
	router.Get("/projects/:id/daily-logs/:logId/photos", p.listDailyLogPhotos)
	router.Post("/projects/:id/daily-logs/:logId/photos", p.uploadDailyLogPhoto)
	router.Get("/projects/:id/permit-alerts", p.listProjectPermitAlerts)
	router.Get("/projects/:id", p.getProject)
	router.Patch("/projects/:id", p.updateProject)

	router.Get("/subcontractors", p.listSubcontractors)
	router.Post("/subcontractors", p.createSubcontractor)

	router.Get("/change-orders", p.listChangeOrders)
	router.Post("/change-orders", p.createChangeOrder)
	router.Get("/change-orders/:id", p.getChangeOrder)
	router.Post("/change-orders/:id/submit", p.submitChangeOrder)
	router.Post("/change-orders/:id/approve", middleware.RequireRole("admin"), p.approveChangeOrder)
	router.Post("/change-orders/:id/reject", middleware.RequireRole("admin"), p.rejectChangeOrder)

	router.Get("/milestones", p.listMilestones)
	router.Post("/milestones", p.createMilestone)
	router.Get("/milestones/:id", p.getMilestone)
	router.Patch("/milestones/:id", p.updateMilestone)

	router.Get("/permits", p.listPermits)
	router.Post("/permits", p.createPermit)

	router.Get("/lien-waivers", p.listLienWaivers)
	router.Post("/lien-waivers", p.createLienWaiver)

	router.Get("/rfis", p.listRFIs)
	router.Post("/rfis", p.createRFI)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 180, Name: "construction_projects", UpSQL: projectsSQL},
		{Version: 181, Name: "construction_change_orders", UpSQL: changeOrdersSQL},
		{Version: 182, Name: "construction_milestones", UpSQL: milestonesSQL},
		{Version: 183, Name: "construction_daily_logs", UpSQL: dailyLogsSQL},
		{Version: 184, Name: "construction_subcontractors", UpSQL: subcontractorsSQL},
		{Version: 185, Name: "construction_permits", UpSQL: permitsSQL},
		{Version: 186, Name: "construction_lien_waivers", UpSQL: lienWaiversSQL},
		{Version: 187, Name: "construction_rfis", UpSQL: rfisSQL},
		{Version: 188, Name: "construction_change_order_workflow", UpSQL: changeOrderWorkflowSQL},
		{Version: 189, Name: "construction_daily_log_photos", UpSQL: dailyLogPhotosSQL},
	}
}

const projectsSQL = `
CREATE TABLE IF NOT EXISTS projects (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID,
	name TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'active',
	budget_cents BIGINT NOT NULL DEFAULT 0,
	version INT NOT NULL DEFAULT 1,
	start_date DATE,
	end_date DATE,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT projects_status_check CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects (tenant_id);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_tenant ON projects;
CREATE POLICY projects_tenant ON projects
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const changeOrdersSQL = `
CREATE TABLE IF NOT EXISTS change_orders (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	project_id UUID NOT NULL REFERENCES projects(id),
	title TEXT NOT NULL,
	description TEXT DEFAULT '',
	amount_cents BIGINT NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'draft',
	approved_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT change_orders_status_check CHECK (status IN ('draft', 'pending', 'approved', 'rejected'))
);
CREATE INDEX IF NOT EXISTS idx_change_orders_tenant ON change_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project ON change_orders (tenant_id, project_id);
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS change_orders_tenant ON change_orders;
CREATE POLICY change_orders_tenant ON change_orders
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const milestonesSQL = `
CREATE TABLE IF NOT EXISTS project_milestones (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	project_id UUID NOT NULL REFERENCES projects(id),
	name TEXT NOT NULL,
	percent_complete INT NOT NULL DEFAULT 0,
	amount_cents BIGINT NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'pending',
	due_date DATE,
	completed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT project_milestones_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'billed')),
	CONSTRAINT project_milestones_percent_check CHECK (percent_complete >= 0 AND percent_complete <= 100)
);
CREATE INDEX IF NOT EXISTS idx_project_milestones_tenant ON project_milestones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones (tenant_id, project_id);
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_milestones_tenant ON project_milestones;
CREATE POLICY project_milestones_tenant ON project_milestones
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const dailyLogsSQL = `
CREATE TABLE IF NOT EXISTS project_daily_logs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	project_id UUID NOT NULL REFERENCES projects(id),
	log_date DATE NOT NULL DEFAULT CURRENT_DATE,
	weather TEXT DEFAULT '',
	crew_count INT NOT NULL DEFAULT 0,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_daily_logs_tenant ON project_daily_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_daily_logs_project ON project_daily_logs (tenant_id, project_id);
ALTER TABLE project_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_daily_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_daily_logs_tenant ON project_daily_logs;
CREATE POLICY project_daily_logs_tenant ON project_daily_logs
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const subcontractorsSQL = `
CREATE TABLE IF NOT EXISTS subcontractors (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	company_name TEXT NOT NULL,
	contact_name TEXT DEFAULT '',
	email TEXT DEFAULT '',
	phone TEXT DEFAULT '',
	trade TEXT DEFAULT '',
	status TEXT NOT NULL DEFAULT 'active',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT subcontractors_status_check CHECK (status IN ('active', 'inactive'))
);
CREATE INDEX IF NOT EXISTS idx_subcontractors_tenant ON subcontractors (tenant_id);
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subcontractors_tenant ON subcontractors;
CREATE POLICY subcontractors_tenant ON subcontractors
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const permitsSQL = `
CREATE TABLE IF NOT EXISTS permits (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	project_id UUID NOT NULL REFERENCES projects(id),
	permit_number TEXT DEFAULT '',
	permit_type TEXT NOT NULL DEFAULT 'building',
	jurisdiction TEXT DEFAULT '',
	status TEXT NOT NULL DEFAULT 'draft',
	issued_date DATE,
	expires_date DATE,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT permits_status_check CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected', 'expired'))
);
CREATE INDEX IF NOT EXISTS idx_permits_tenant ON permits (tenant_id);
CREATE INDEX IF NOT EXISTS idx_permits_project ON permits (tenant_id, project_id);
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permits_tenant ON permits;
CREATE POLICY permits_tenant ON permits
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const lienWaiversSQL = `
CREATE TABLE IF NOT EXISTS lien_waivers (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	project_id UUID NOT NULL REFERENCES projects(id),
	party_name TEXT NOT NULL,
	waiver_type TEXT NOT NULL DEFAULT 'conditional',
	amount_cents BIGINT NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'draft',
	signed_at TIMESTAMPTZ,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT lien_waivers_type_check CHECK (waiver_type IN ('conditional', 'unconditional', 'partial', 'final')),
	CONSTRAINT lien_waivers_status_check CHECK (status IN ('draft', 'pending', 'signed', 'voided'))
);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_tenant ON lien_waivers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_project ON lien_waivers (tenant_id, project_id);
ALTER TABLE lien_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lien_waivers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lien_waivers_tenant ON lien_waivers;
CREATE POLICY lien_waivers_tenant ON lien_waivers
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const rfisSQL = `
CREATE TABLE IF NOT EXISTS rfis (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	project_id UUID NOT NULL REFERENCES projects(id),
	subject TEXT NOT NULL,
	question TEXT NOT NULL DEFAULT '',
	response TEXT DEFAULT '',
	status TEXT NOT NULL DEFAULT 'open',
	due_date DATE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT rfis_status_check CHECK (status IN ('open', 'answered', 'closed'))
);
CREATE INDEX IF NOT EXISTS idx_rfis_tenant ON rfis (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfis_project ON rfis (tenant_id, project_id);
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfis FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rfis_tenant ON rfis;
CREATE POLICY rfis_tenant ON rfis
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type Project struct {
	ID          string     `json:"id"`
	CustomerID  string     `json:"customer_id,omitempty"`
	Name        string     `json:"name"`
	Status      string     `json:"status"`
	BudgetCents int64      `json:"budget_cents"`
	Version     int        `json:"version"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	EndDate     *time.Time `json:"end_date,omitempty"`
	Notes       string     `json:"notes,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (p *Plugin) listProjects(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, customer_id, name, status, budget_cents, version, start_date, end_date, notes, created_at
		FROM projects WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list projects")
	}
	defer rows.Close()

	var list []Project
	for rows.Next() {
		var pr Project
		var customerID *string
		if err := rows.Scan(&pr.ID, &customerID, &pr.Name, &pr.Status, &pr.BudgetCents, &pr.Version, &pr.StartDate, &pr.EndDate, &pr.Notes, &pr.CreatedAt); err != nil {
			return err
		}
		if customerID != nil {
			pr.CustomerID = *customerID
		}
		list = append(list, pr)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createProject(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		CustomerID  string     `json:"customer_id"`
		Name        string     `json:"name"`
		BudgetCents int64      `json:"budget_cents"`
		StartDate   *time.Time `json:"start_date"`
		EndDate     *time.Time `json:"end_date"`
		Notes       string     `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil || body.Name == "" {
		return fiber.NewError(400, "name required")
	}

	id := uuid.New().String()
	var customerID *string
	if body.CustomerID != "" {
		customerID = &body.CustomerID
	}
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO projects (id, tenant_id, customer_id, name, budget_cents, start_date, end_date, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING created_at
	`, id, tid, customerID, body.Name, body.BudgetCents, body.StartDate, body.EndDate, body.Notes).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create project")
	}
	return c.Status(201).JSON(Project{
		ID: id, CustomerID: body.CustomerID, Name: body.Name, Status: "active",
		BudgetCents: body.BudgetCents, Version: 1, StartDate: body.StartDate,
		EndDate: body.EndDate, Notes: body.Notes, CreatedAt: createdAt,
	})
}

func (p *Plugin) getProject(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var pr Project
	var customerID *string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, customer_id, name, status, budget_cents, version, start_date, end_date, notes, created_at
		FROM projects WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&pr.ID, &customerID, &pr.Name, &pr.Status, &pr.BudgetCents, &pr.Version, &pr.StartDate, &pr.EndDate, &pr.Notes, &pr.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "project not found")
	}
	if customerID != nil {
		pr.CustomerID = *customerID
	}
	return c.JSON(pr)
}

func (p *Plugin) updateProject(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name        *string    `json:"name"`
		Status      *string    `json:"status"`
		BudgetCents *int64     `json:"budget_cents"`
		Version     int        `json:"version"`
		StartDate   *time.Time `json:"start_date"`
		EndDate     *time.Time `json:"end_date"`
		Notes       *string    `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE projects SET
			name = COALESCE($3, name),
			status = COALESCE($4, status),
			budget_cents = COALESCE($5, budget_cents),
			start_date = COALESCE($6, start_date),
			end_date = COALESCE($7, end_date),
			notes = COALESCE($8, notes),
			version = version + 1,
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND version = $9
	`, c.Params("id"), tid, body.Name, body.Status, body.BudgetCents, body.StartDate, body.EndDate, body.Notes, body.Version)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update project")
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(409, "project not found or version conflict")
	}
	return p.getProject(c)
}

type ChangeOrder struct {
	ID               string     `json:"id"`
	ProjectID        string     `json:"project_id"`
	Title            string     `json:"title"`
	Description      string     `json:"description,omitempty"`
	AmountCents      int64      `json:"amount_cents"`
	Status           string     `json:"status"`
	RejectionReason  string     `json:"rejection_reason,omitempty"`
	ApprovedAt       *time.Time `json:"approved_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

func (p *Plugin) listChangeOrders(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Query("project_id")
	q := `
		SELECT id, project_id, title, description, amount_cents, status, rejection_reason, approved_at, created_at
		FROM change_orders WHERE tenant_id = $1`
	args := []interface{}{tid}
	if projectID != "" {
		q += ` AND project_id = $2`
		args = append(args, projectID)
	}
	q += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := p.pool.Query(c.UserContext(), q, args...)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list change orders")
	}
	defer rows.Close()

	var list []ChangeOrder
	for rows.Next() {
		var co ChangeOrder
		if err := rows.Scan(&co.ID, &co.ProjectID, &co.Title, &co.Description, &co.AmountCents, &co.Status, &co.RejectionReason, &co.ApprovedAt, &co.CreatedAt); err != nil {
			return err
		}
		list = append(list, co)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createChangeOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		ProjectID   string `json:"project_id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		AmountCents int64  `json:"amount_cents"`
	}
	if err := c.BodyParser(&body); err != nil || body.ProjectID == "" || body.Title == "" {
		return fiber.NewError(400, "project_id and title required")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO change_orders (id, tenant_id, project_id, title, description, amount_cents)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING created_at
	`, id, tid, body.ProjectID, body.Title, body.Description, body.AmountCents).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create change order")
	}
	return c.Status(201).JSON(ChangeOrder{
		ID: id, ProjectID: body.ProjectID, Title: body.Title,
		Description: body.Description, AmountCents: body.AmountCents,
		Status: "draft", CreatedAt: createdAt,
	})
}

func (p *Plugin) getChangeOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var co ChangeOrder
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, project_id, title, description, amount_cents, status, rejection_reason, approved_at, created_at
		FROM change_orders WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&co.ID, &co.ProjectID, &co.Title, &co.Description, &co.AmountCents, &co.Status, &co.RejectionReason, &co.ApprovedAt, &co.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "change order not found")
	}
	return c.JSON(co)
}

func (p *Plugin) submitChangeOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	coID := c.Params("id")

	var co ChangeOrder
	err := p.pool.QueryRow(c.UserContext(), `
		UPDATE change_orders SET status = 'pending', rejection_reason = '', updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
		RETURNING id, project_id, title, description, amount_cents, status, rejection_reason, approved_at, created_at
	`, coID, tid).Scan(&co.ID, &co.ProjectID, &co.Title, &co.Description, &co.AmountCents, &co.Status, &co.RejectionReason, &co.ApprovedAt, &co.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "change order not found or not submittable")
	}

	if p.bus != nil {
		_ = p.bus.Publish(c.UserContext(), tid, "construction.change_order.submitted", map[string]interface{}{
			"change_order_id": co.ID,
			"project_id":      co.ProjectID,
			"amount_cents":    co.AmountCents,
		})
	}
	return c.JSON(co)
}

func (p *Plugin) approveChangeOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	coID := c.Params("id")

	tx, err := p.pool.Begin(c.UserContext())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to approve change order")
	}
	defer tx.Rollback(c.UserContext())

	var co ChangeOrder
	var approvedAt time.Time
	err = tx.QueryRow(c.UserContext(), `
		UPDATE change_orders SET status = 'approved', approved_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
		RETURNING id, project_id, title, description, amount_cents, status, rejection_reason, approved_at, created_at
	`, coID, tid).Scan(&co.ID, &co.ProjectID, &co.Title, &co.Description, &co.AmountCents, &co.Status, &co.RejectionReason, &approvedAt, &co.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "change order not found or already approved")
	}
	co.ApprovedAt = &approvedAt

	_, err = tx.Exec(c.UserContext(), `
		UPDATE projects SET budget_cents = budget_cents + $3, version = version + 1, updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, co.ProjectID, tid, co.AmountCents)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to approve change order")
	}

	if err := tx.Commit(c.UserContext()); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to approve change order")
	}

	if p.bus != nil {
		_ = p.bus.Publish(c.UserContext(), tid, "construction.change_order.approved", map[string]interface{}{
			"change_order_id": co.ID,
			"project_id":      co.ProjectID,
			"amount_cents":    co.AmountCents,
		})
	}
	return c.JSON(co)
}

func (p *Plugin) rejectChangeOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	coID := c.Params("id")

	var body struct {
		Reason string `json:"reason"`
	}
	_ = c.BodyParser(&body)

	var co ChangeOrder
	err := p.pool.QueryRow(c.UserContext(), `
		UPDATE change_orders SET status = 'rejected', rejection_reason = $3, updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
		RETURNING id, project_id, title, description, amount_cents, status, rejection_reason, approved_at, created_at
	`, coID, tid, body.Reason).Scan(&co.ID, &co.ProjectID, &co.Title, &co.Description, &co.AmountCents, &co.Status, &co.RejectionReason, &co.ApprovedAt, &co.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "change order not found or not rejectable")
	}

	if p.bus != nil {
		_ = p.bus.Publish(c.UserContext(), tid, "construction.change_order.rejected", map[string]interface{}{
			"change_order_id": co.ID,
			"project_id":      co.ProjectID,
			"reason":          body.Reason,
		})
	}
	return c.JSON(co)
}

type Milestone struct {
	ID              string     `json:"id"`
	ProjectID       string     `json:"project_id"`
	Name            string     `json:"name"`
	PercentComplete int        `json:"percent_complete"`
	AmountCents     int64      `json:"amount_cents"`
	Status          string     `json:"status"`
	DueDate         *time.Time `json:"due_date,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (p *Plugin) listMilestones(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Query("project_id")
	q := `
		SELECT id, project_id, name, percent_complete, amount_cents, status, due_date, completed_at, created_at
		FROM project_milestones WHERE tenant_id = $1`
	args := []interface{}{tid}
	if projectID != "" {
		q += ` AND project_id = $2`
		args = append(args, projectID)
	}
	q += ` ORDER BY due_date NULLS LAST, created_at DESC LIMIT 100`

	rows, err := p.pool.Query(c.UserContext(), q, args...)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list milestones")
	}
	defer rows.Close()

	var list []Milestone
	for rows.Next() {
		var ms Milestone
		if err := rows.Scan(&ms.ID, &ms.ProjectID, &ms.Name, &ms.PercentComplete, &ms.AmountCents, &ms.Status, &ms.DueDate, &ms.CompletedAt, &ms.CreatedAt); err != nil {
			return err
		}
		list = append(list, ms)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createMilestone(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		ProjectID       string     `json:"project_id"`
		Name            string     `json:"name"`
		PercentComplete int        `json:"percent_complete"`
		AmountCents     int64      `json:"amount_cents"`
		DueDate         *time.Time `json:"due_date"`
	}
	if err := c.BodyParser(&body); err != nil || body.ProjectID == "" || body.Name == "" {
		return fiber.NewError(400, "project_id and name required")
	}
	if body.PercentComplete < 0 || body.PercentComplete > 100 {
		return fiber.NewError(400, "percent_complete must be 0-100")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO project_milestones (id, tenant_id, project_id, name, percent_complete, amount_cents, due_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING created_at
	`, id, tid, body.ProjectID, body.Name, body.PercentComplete, body.AmountCents, body.DueDate).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create milestone")
	}
	return c.Status(201).JSON(Milestone{
		ID: id, ProjectID: body.ProjectID, Name: body.Name,
		PercentComplete: body.PercentComplete, AmountCents: body.AmountCents,
		Status: "pending", DueDate: body.DueDate, CreatedAt: createdAt,
	})
}

func (p *Plugin) getMilestone(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var ms Milestone
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, project_id, name, percent_complete, amount_cents, status, due_date, completed_at, created_at
		FROM project_milestones WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&ms.ID, &ms.ProjectID, &ms.Name, &ms.PercentComplete, &ms.AmountCents, &ms.Status, &ms.DueDate, &ms.CompletedAt, &ms.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "milestone not found")
	}
	return c.JSON(ms)
}

func (p *Plugin) updateMilestone(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name            *string    `json:"name"`
		PercentComplete *int       `json:"percent_complete"`
		AmountCents     *int64     `json:"amount_cents"`
		Status          *string    `json:"status"`
		DueDate         *time.Time `json:"due_date"`
		CompletedAt     *time.Time `json:"completed_at"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.PercentComplete != nil && (*body.PercentComplete < 0 || *body.PercentComplete > 100) {
		return fiber.NewError(400, "percent_complete must be 0-100")
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE project_milestones SET
			name = COALESCE($3, name),
			percent_complete = COALESCE($4, percent_complete),
			amount_cents = COALESCE($5, amount_cents),
			status = COALESCE($6, status),
			due_date = COALESCE($7, due_date),
			completed_at = COALESCE($8, completed_at),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Name, body.PercentComplete, body.AmountCents, body.Status, body.DueDate, body.CompletedAt)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "milestone not found")
	}
	return p.getMilestone(c)
}

type DailyLog struct {
	ID         string    `json:"id"`
	ProjectID  string    `json:"project_id"`
	LogDate    time.Time `json:"log_date"`
	Weather    string    `json:"weather,omitempty"`
	CrewCount  int       `json:"crew_count"`
	Notes      string    `json:"notes,omitempty"`
	PhotoCount int       `json:"photo_count"`
	CreatedAt  time.Time `json:"created_at"`
}

func (p *Plugin) listDailyLogs(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Params("id")

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT dl.id, dl.project_id, dl.log_date, dl.weather, dl.crew_count, dl.notes,
			COALESCE(photo_counts.cnt, 0), dl.created_at
		FROM project_daily_logs dl
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS cnt FROM project_daily_log_photos
			WHERE tenant_id = dl.tenant_id AND daily_log_id = dl.id
		) photo_counts ON true
		WHERE dl.tenant_id = $1 AND dl.project_id = $2
		ORDER BY dl.log_date DESC, dl.created_at DESC LIMIT 100
	`, tid, projectID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list daily logs")
	}
	defer rows.Close()

	var list []DailyLog
	for rows.Next() {
		var dl DailyLog
		if err := rows.Scan(&dl.ID, &dl.ProjectID, &dl.LogDate, &dl.Weather, &dl.CrewCount, &dl.Notes, &dl.PhotoCount, &dl.CreatedAt); err != nil {
			return err
		}
		list = append(list, dl)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createDailyLog(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Params("id")

	var exists bool
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND tenant_id = $2)
	`, projectID, tid).Scan(&exists)
	if err != nil || !exists {
		return fiber.NewError(404, "project not found")
	}

	var body struct {
		LogDate   *time.Time `json:"log_date"`
		Weather   string     `json:"weather"`
		CrewCount int        `json:"crew_count"`
		Notes     string     `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}

	logDate := time.Now().UTC().Truncate(24 * time.Hour)
	if body.LogDate != nil {
		logDate = body.LogDate.UTC().Truncate(24 * time.Hour)
	}

	id := uuid.New().String()
	var createdAt time.Time
	err = p.pool.QueryRow(c.UserContext(), `
		INSERT INTO project_daily_logs (id, tenant_id, project_id, log_date, weather, crew_count, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING created_at
	`, id, tid, projectID, logDate, body.Weather, body.CrewCount, body.Notes).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create daily log")
	}
	return c.Status(201).JSON(DailyLog{
		ID: id, ProjectID: projectID, LogDate: logDate,
		Weather: body.Weather, CrewCount: body.CrewCount, Notes: body.Notes,
		PhotoCount: 0, CreatedAt: createdAt,
	})
}

type Subcontractor struct {
	ID          string    `json:"id"`
	CompanyName string    `json:"company_name"`
	ContactName string    `json:"contact_name,omitempty"`
	Email       string    `json:"email,omitempty"`
	Phone       string    `json:"phone,omitempty"`
	Trade       string    `json:"trade,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

func (p *Plugin) listSubcontractors(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, company_name, contact_name, email, phone, trade, status, created_at
		FROM subcontractors WHERE tenant_id = $1 ORDER BY company_name LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list subcontractors")
	}
	defer rows.Close()

	var list []Subcontractor
	for rows.Next() {
		var sc Subcontractor
		if err := rows.Scan(&sc.ID, &sc.CompanyName, &sc.ContactName, &sc.Email, &sc.Phone, &sc.Trade, &sc.Status, &sc.CreatedAt); err != nil {
			return err
		}
		list = append(list, sc)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createSubcontractor(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		CompanyName string `json:"company_name"`
		ContactName string `json:"contact_name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Trade       string `json:"trade"`
	}
	if err := c.BodyParser(&body); err != nil || body.CompanyName == "" {
		return fiber.NewError(400, "company_name required")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO subcontractors (id, tenant_id, company_name, contact_name, email, phone, trade)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING created_at
	`, id, tid, body.CompanyName, body.ContactName, body.Email, body.Phone, body.Trade).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create subcontractor")
	}
	return c.Status(201).JSON(Subcontractor{
		ID: id, CompanyName: body.CompanyName, ContactName: body.ContactName,
		Email: body.Email, Phone: body.Phone, Trade: body.Trade,
		Status: "active", CreatedAt: createdAt,
	})
}

type Permit struct {
	ID           string     `json:"id"`
	ProjectID    string     `json:"project_id"`
	PermitNumber string     `json:"permit_number,omitempty"`
	PermitType   string     `json:"permit_type"`
	Jurisdiction string     `json:"jurisdiction,omitempty"`
	Status       string     `json:"status"`
	IssuedDate   *time.Time `json:"issued_date,omitempty"`
	ExpiresDate  *time.Time `json:"expires_date,omitempty"`
	Notes        string     `json:"notes,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

func (p *Plugin) listPermits(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Query("project_id")
	q := `
		SELECT id, project_id, permit_number, permit_type, jurisdiction, status, issued_date, expires_date, notes, created_at
		FROM permits WHERE tenant_id = $1`
	args := []interface{}{tid}
	if projectID != "" {
		q += ` AND project_id = $2`
		args = append(args, projectID)
	}
	q += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := p.pool.Query(c.UserContext(), q, args...)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list permits")
	}
	defer rows.Close()

	var list []Permit
	for rows.Next() {
		var pm Permit
		if err := rows.Scan(&pm.ID, &pm.ProjectID, &pm.PermitNumber, &pm.PermitType, &pm.Jurisdiction, &pm.Status, &pm.IssuedDate, &pm.ExpiresDate, &pm.Notes, &pm.CreatedAt); err != nil {
			return err
		}
		list = append(list, pm)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createPermit(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		ProjectID    string     `json:"project_id"`
		PermitNumber string     `json:"permit_number"`
		PermitType   string     `json:"permit_type"`
		Jurisdiction string     `json:"jurisdiction"`
		IssuedDate   *time.Time `json:"issued_date"`
		ExpiresDate  *time.Time `json:"expires_date"`
		Notes        string     `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil || body.ProjectID == "" {
		return fiber.NewError(400, "project_id required")
	}
	permitType := body.PermitType
	if permitType == "" {
		permitType = "building"
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO permits (id, tenant_id, project_id, permit_number, permit_type, jurisdiction, issued_date, expires_date, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING created_at
	`, id, tid, body.ProjectID, body.PermitNumber, permitType, body.Jurisdiction, body.IssuedDate, body.ExpiresDate, body.Notes).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create permit")
	}
	return c.Status(201).JSON(Permit{
		ID: id, ProjectID: body.ProjectID, PermitNumber: body.PermitNumber,
		PermitType: permitType, Jurisdiction: body.Jurisdiction, Status: "draft",
		IssuedDate: body.IssuedDate, ExpiresDate: body.ExpiresDate, Notes: body.Notes, CreatedAt: createdAt,
	})
}

type LienWaiver struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"project_id"`
	PartyName   string     `json:"party_name"`
	WaiverType  string     `json:"waiver_type"`
	AmountCents int64      `json:"amount_cents"`
	Status      string     `json:"status"`
	SignedAt    *time.Time `json:"signed_at,omitempty"`
	Notes       string     `json:"notes,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (p *Plugin) listLienWaivers(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Query("project_id")
	q := `
		SELECT id, project_id, party_name, waiver_type, amount_cents, status, signed_at, notes, created_at
		FROM lien_waivers WHERE tenant_id = $1`
	args := []interface{}{tid}
	if projectID != "" {
		q += ` AND project_id = $2`
		args = append(args, projectID)
	}
	q += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := p.pool.Query(c.UserContext(), q, args...)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list lien waivers")
	}
	defer rows.Close()

	var list []LienWaiver
	for rows.Next() {
		var lw LienWaiver
		if err := rows.Scan(&lw.ID, &lw.ProjectID, &lw.PartyName, &lw.WaiverType, &lw.AmountCents, &lw.Status, &lw.SignedAt, &lw.Notes, &lw.CreatedAt); err != nil {
			return err
		}
		list = append(list, lw)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createLienWaiver(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		ProjectID   string `json:"project_id"`
		PartyName   string `json:"party_name"`
		WaiverType  string `json:"waiver_type"`
		AmountCents int64  `json:"amount_cents"`
		Notes       string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil || body.ProjectID == "" || body.PartyName == "" {
		return fiber.NewError(400, "project_id and party_name required")
	}
	waiverType := body.WaiverType
	if waiverType == "" {
		waiverType = "conditional"
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO lien_waivers (id, tenant_id, project_id, party_name, waiver_type, amount_cents, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING created_at
	`, id, tid, body.ProjectID, body.PartyName, waiverType, body.AmountCents, body.Notes).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create lien waiver")
	}
	return c.Status(201).JSON(LienWaiver{
		ID: id, ProjectID: body.ProjectID, PartyName: body.PartyName,
		WaiverType: waiverType, AmountCents: body.AmountCents,
		Status: "draft", Notes: body.Notes, CreatedAt: createdAt,
	})
}

type RFI struct {
	ID        string     `json:"id"`
	ProjectID string     `json:"project_id"`
	Subject   string     `json:"subject"`
	Question  string     `json:"question,omitempty"`
	Response  string     `json:"response,omitempty"`
	Status    string     `json:"status"`
	DueDate   *time.Time `json:"due_date,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (p *Plugin) listRFIs(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Query("project_id")
	q := `
		SELECT id, project_id, subject, question, response, status, due_date, created_at
		FROM rfis WHERE tenant_id = $1`
	args := []interface{}{tid}
	if projectID != "" {
		q += ` AND project_id = $2`
		args = append(args, projectID)
	}
	q += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := p.pool.Query(c.UserContext(), q, args...)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list RFIs")
	}
	defer rows.Close()

	var list []RFI
	for rows.Next() {
		var rfi RFI
		if err := rows.Scan(&rfi.ID, &rfi.ProjectID, &rfi.Subject, &rfi.Question, &rfi.Response, &rfi.Status, &rfi.DueDate, &rfi.CreatedAt); err != nil {
			return err
		}
		list = append(list, rfi)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createRFI(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		ProjectID string     `json:"project_id"`
		Subject   string     `json:"subject"`
		Question  string     `json:"question"`
		DueDate   *time.Time `json:"due_date"`
	}
	if err := c.BodyParser(&body); err != nil || body.ProjectID == "" || body.Subject == "" {
		return fiber.NewError(400, "project_id and subject required")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO rfis (id, tenant_id, project_id, subject, question, due_date)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING created_at
	`, id, tid, body.ProjectID, body.Subject, body.Question, body.DueDate).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create RFI")
	}
	return c.Status(201).JSON(RFI{
		ID: id, ProjectID: body.ProjectID, Subject: body.Subject,
		Question: body.Question, Status: "open", DueDate: body.DueDate, CreatedAt: createdAt,
	})
}
