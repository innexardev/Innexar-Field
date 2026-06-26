package dispatch

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/events"
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
		ID:            "dispatch",
		Name:          "Dispatch",
		Version:       "1.0.0",
		Dependencies:  []string{"scheduling"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"dispatch.read", "dispatch.write"},
		Nav: []plugin.NavItem{
			{Label: "Work Orders", Path: "/work-orders", Icon: "clipboard-list"},
			{Label: "Dispatch Board", Path: "/dispatch", Icon: "map-pin"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/board", p.getBoard)
	router.Get("/work-orders", p.listWorkOrders)
	router.Post("/work-orders", p.createWorkOrder)
	router.Get("/work-orders/:id", p.getWorkOrder)
	router.Patch("/work-orders/:id", p.updateWorkOrder)
	router.Delete("/work-orders/:id", p.deleteWorkOrder)
	router.Get("/work-orders/:id/assignments", p.listAssignments)
	router.Post("/work-orders/:id/assignments", p.createAssignment)
	router.Patch("/assignments/:id", p.updateAssignment)
	router.Delete("/assignments/:id", p.deleteAssignment)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{{Version: 140, Name: "dispatch_work_orders", UpSQL: dispatchSQL}}
}

const dispatchSQL = `
CREATE TABLE IF NOT EXISTS work_orders (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	job_id UUID,
	title TEXT NOT NULL,
	description TEXT DEFAULT '',
	priority TEXT NOT NULL DEFAULT 'normal',
	status TEXT NOT NULL DEFAULT 'open',
	sla_due_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant ON work_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_job ON work_orders (tenant_id, job_id);
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_orders_tenant ON work_orders;
CREATE POLICY work_orders_tenant ON work_orders
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS work_order_assignments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
	technician_id UUID NOT NULL,
	status TEXT NOT NULL DEFAULT 'assigned',
	assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wo_assignments_tenant ON work_order_assignments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_wo_assignments_wo ON work_order_assignments (work_order_id);
ALTER TABLE work_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wo_assignments_tenant ON work_order_assignments;
CREATE POLICY wo_assignments_tenant ON work_order_assignments
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type WorkOrder struct {
	ID          string     `json:"id"`
	JobID       string     `json:"job_id,omitempty"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Priority    string     `json:"priority"`
	Status      string     `json:"status"`
	SLADueAt    *time.Time `json:"sla_due_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Assignment struct {
	ID           string    `json:"id"`
	WorkOrderID  string    `json:"work_order_id"`
	TechnicianID string    `json:"technician_id"`
	Status       string    `json:"status"`
	AssignedAt   time.Time `json:"assigned_at"`
}

type BoardWorkOrder struct {
	WorkOrder    WorkOrder    `json:"work_order"`
	Assignments  []Assignment `json:"assignments"`
}

type BoardColumn struct {
	Status      string           `json:"status"`
	WorkOrders  []BoardWorkOrder `json:"work_orders"`
	Count       int              `json:"count"`
}

func (p *Plugin) getBoard(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT wo.id, COALESCE(wo.job_id::text,''), wo.title, wo.description, wo.priority, wo.status,
			wo.sla_due_at, wo.created_at, wo.updated_at,
			a.id, a.work_order_id, a.technician_id, a.status, a.assigned_at
		FROM work_orders wo
		LEFT JOIN work_order_assignments a ON a.work_order_id = wo.id AND a.tenant_id = wo.tenant_id
		WHERE wo.tenant_id = $1
		ORDER BY wo.status, wo.priority DESC, wo.created_at DESC
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load dispatch board")
	}
	defer rows.Close()

	byID := make(map[string]*BoardWorkOrder)
	order := make([]string, 0)
	summary := make(map[string]int)

	for rows.Next() {
		var wo WorkOrder
		var aID, aWOID, aTechID, aStatus *string
		var aAssignedAt *time.Time
		if err := rows.Scan(
			&wo.ID, &wo.JobID, &wo.Title, &wo.Description, &wo.Priority, &wo.Status,
			&wo.SLADueAt, &wo.CreatedAt, &wo.UpdatedAt,
			&aID, &aWOID, &aTechID, &aStatus, &aAssignedAt,
		); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load dispatch board")
		}

		entry, ok := byID[wo.ID]
		if !ok {
			entry = &BoardWorkOrder{WorkOrder: wo, Assignments: []Assignment{}}
			byID[wo.ID] = entry
			order = append(order, wo.ID)
			summary[wo.Status]++
		}
		if aID != nil && aTechID != nil && aStatus != nil && aAssignedAt != nil {
			entry.Assignments = append(entry.Assignments, Assignment{
				ID:           *aID,
				WorkOrderID:  wo.ID,
				TechnicianID: *aTechID,
				Status:       *aStatus,
				AssignedAt:   *aAssignedAt,
			})
		}
	}

	items := make([]BoardWorkOrder, 0, len(order))
	for _, id := range order {
		items = append(items, *byID[id])
	}

	columns := make([]BoardColumn, 0, len(summary))
	for status, count := range summary {
		col := BoardColumn{Status: status, Count: count, WorkOrders: []BoardWorkOrder{}}
		for _, item := range items {
			if item.WorkOrder.Status == status {
				col.WorkOrders = append(col.WorkOrders, item)
			}
		}
		columns = append(columns, col)
	}

	return c.JSON(fiber.Map{
		"data":    items,
		"columns": columns,
		"summary": summary,
	})
}

func (p *Plugin) listWorkOrders(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, COALESCE(job_id::text,''), title, description, priority, status, sla_due_at, created_at, updated_at
		FROM work_orders WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list work orders")
	}
	defer rows.Close()

	var list []WorkOrder
	for rows.Next() {
		var wo WorkOrder
		if err := rows.Scan(&wo.ID, &wo.JobID, &wo.Title, &wo.Description, &wo.Priority, &wo.Status, &wo.SLADueAt, &wo.CreatedAt, &wo.UpdatedAt); err != nil {
			return err
		}
		list = append(list, wo)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createWorkOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		JobID       string `json:"job_id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Priority    string `json:"priority"`
		SLADueAt    string `json:"sla_due_at"`
	}
	if err := c.BodyParser(&body); err != nil || body.Title == "" {
		return fiber.NewError(400, "title required")
	}
	if body.Priority == "" {
		body.Priority = "normal"
	}
	id := uuid.New().String()
	var sla *time.Time
	if body.SLADueAt != "" {
		t, err := time.Parse(time.RFC3339, body.SLADueAt)
		if err == nil {
			sla = &t
		}
	}
	var createdAt, updatedAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO work_orders (id, tenant_id, job_id, title, description, priority, sla_due_at)
		VALUES ($1, $2, NULLIF($3,'')::uuid, $4, $5, $6, $7)
		RETURNING created_at, updated_at
	`, id, tid, body.JobID, body.Title, body.Description, body.Priority, sla).Scan(&createdAt, &updatedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create work order")
	}
	return c.Status(201).JSON(WorkOrder{
		ID: id, JobID: body.JobID, Title: body.Title, Description: body.Description,
		Priority: body.Priority, Status: "open", SLADueAt: sla, CreatedAt: createdAt, UpdatedAt: updatedAt,
	})
}

func (p *Plugin) getWorkOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var wo WorkOrder
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(job_id::text,''), title, description, priority, status, sla_due_at, created_at, updated_at
		FROM work_orders WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&wo.ID, &wo.JobID, &wo.Title, &wo.Description, &wo.Priority, &wo.Status, &wo.SLADueAt, &wo.CreatedAt, &wo.UpdatedAt)
	if err != nil {
		return fiber.NewError(404, "work order not found")
	}
	return c.JSON(wo)
}

func (p *Plugin) updateWorkOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Priority    *string `json:"priority"`
		Status      *string `json:"status"`
		JobID       *string `json:"job_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE work_orders SET
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			priority = COALESCE($5, priority),
			status = COALESCE($6, status),
			job_id = COALESCE(NULLIF($7,'')::uuid, job_id),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Title, body.Description, body.Priority, body.Status, body.JobID)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "work order not found")
	}
	return p.getWorkOrder(c)
}

func (p *Plugin) deleteWorkOrder(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `
		DELETE FROM work_orders WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "work order not found")
	}
	return c.SendStatus(204)
}

func (p *Plugin) listAssignments(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	woID := c.Params("id")
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, work_order_id, technician_id, status, assigned_at
		FROM work_order_assignments
		WHERE tenant_id = $1 AND work_order_id = $2
		ORDER BY assigned_at DESC
	`, tid, woID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list assignments")
	}
	defer rows.Close()

	var list []Assignment
	for rows.Next() {
		var a Assignment
		if err := rows.Scan(&a.ID, &a.WorkOrderID, &a.TechnicianID, &a.Status, &a.AssignedAt); err != nil {
			return err
		}
		list = append(list, a)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createAssignment(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	woID := c.Params("id")
	var body struct {
		TechnicianID string `json:"technician_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.TechnicianID == "" {
		return fiber.NewError(400, "technician_id required")
	}

	var exists int
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT 1 FROM work_orders WHERE id = $1 AND tenant_id = $2
	`, woID, tid).Scan(&exists)
	if err != nil {
		return fiber.NewError(404, "work order not found")
	}

	id := uuid.New().String()
	var assignedAt time.Time
	err = p.pool.QueryRow(c.UserContext(), `
		INSERT INTO work_order_assignments (id, tenant_id, work_order_id, technician_id)
		VALUES ($1, $2, $3, $4) RETURNING assigned_at
	`, id, tid, woID, body.TechnicianID).Scan(&assignedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create assignment")
	}
	_, _ = p.pool.Exec(c.UserContext(), `
		UPDATE jobs j
		SET assigned_to = $3, updated_at = NOW()
		FROM work_orders wo
		WHERE wo.id = $1 AND wo.tenant_id = $2
		  AND wo.job_id IS NOT NULL
		  AND j.id = wo.job_id AND j.tenant_id = wo.tenant_id
	`, woID, tid, body.TechnicianID)
	_ = p.bus.Publish(c.UserContext(), tid, "operations.work_order.assigned", map[string]string{
		"work_order_id": woID, "technician_id": body.TechnicianID,
	})
	return c.Status(201).JSON(Assignment{
		ID: id, WorkOrderID: woID, TechnicianID: body.TechnicianID, Status: "assigned", AssignedAt: assignedAt,
	})
}

func (p *Plugin) updateAssignment(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Status *string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE work_order_assignments SET
			status = COALESCE($3, status),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Status)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "assignment not found")
	}
	var a Assignment
	err = p.pool.QueryRow(c.UserContext(), `
		SELECT id, work_order_id, technician_id, status, assigned_at
		FROM work_order_assignments WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&a.ID, &a.WorkOrderID, &a.TechnicianID, &a.Status, &a.AssignedAt)
	if err != nil {
		return fiber.NewError(404, "assignment not found")
	}
	return c.JSON(a)
}

func (p *Plugin) deleteAssignment(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `
		DELETE FROM work_order_assignments WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "assignment not found")
	}
	return c.SendStatus(204)
}
