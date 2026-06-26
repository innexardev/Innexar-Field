package cleaning

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"fmt"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/storage"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct {
	pool    *pgxpool.Pool
	storage *storage.Service
}

func New(pool *pgxpool.Pool) *Plugin { return &Plugin{pool: pool} }

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "cleaning",
		Name:          "Cleaning",
		Version:       "1.0.0",
		Dependencies:  []string{"crm", "scheduling"},
		IndustryPacks: []string{"cleaning"},
		Permissions:   []string{"cleaning.read", "cleaning.write"},
		Nav: []plugin.NavItem{
			{Label: "Today's Cleans", Path: "/cleaning/jobs", Icon: "calendar"},
			{Label: "Quality Review", Path: "/cleaning/qc", Icon: "clipboard-list"},
			{Label: "Supplies", Path: "/cleaning/supplies", Icon: "receipt"},
			{Label: "Recurring Cleans", Path: "/recurring-cleans", Icon: "repeat"},
			{Label: "Clean Phases", Path: "/clean-phases", Icon: "layers"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	p.storage = deps.Storage

	router.Get("/jobs", p.listTodayCleans)
	router.Get("/jobs/:id", p.getCleanJob)
	router.Patch("/jobs/:id/checklist", p.updateCleanChecklist)
	router.Get("/jobs/:id/photos", p.listJobPhotos)
	router.Post("/jobs/:id/photos", p.uploadJobPhoto)

	router.Get("/qc", p.listQcReviews)
	router.Get("/supplies", p.listSupplies)
	router.Patch("/supplies/:id", p.updateSupply)

	router.Get("/recurring-cleans", p.listRecurringCleans)
	router.Post("/recurring-cleans", p.createRecurringClean)
	router.Get("/recurring-cleans/:id", p.getRecurringClean)
	router.Patch("/recurring-cleans/:id", p.updateRecurringClean)

	router.Get("/clean-phases", p.listCleanPhases)
	router.Post("/clean-phases", p.createCleanPhase)
	router.Get("/clean-phases/:id", p.getCleanPhase)
	router.Patch("/clean-phases/:id", p.updateCleanPhase)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 170, Name: "cleaning_recurring_cleans", UpSQL: recurringCleansSQL},
		{Version: 171, Name: "cleaning_phases", UpSQL: cleanPhasesSQL},
		{Version: 172, Name: "cleaning_checklists", UpSQL: cleanChecklistsSQL},
		{Version: 173, Name: "cleaning_qc_photos", UpSQL: cleanQcPhotosSQL},
		{Version: 174, Name: "cleaning_supplies", UpSQL: cleanSuppliesSQL},
	}
}

const recurringCleansSQL = `
CREATE TABLE IF NOT EXISTS recurring_cleans (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID,
	title TEXT NOT NULL,
	frequency TEXT NOT NULL DEFAULT 'weekly',
	phase TEXT NOT NULL DEFAULT 'final',
	next_occurrence TIMESTAMPTZ,
	active BOOLEAN NOT NULL DEFAULT true,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT recurring_cleans_frequency_check CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
	CONSTRAINT recurring_cleans_phase_check CHECK (phase IN ('rough', 'final', 'premium'))
);
CREATE INDEX IF NOT EXISTS idx_recurring_cleans_tenant ON recurring_cleans (tenant_id);
ALTER TABLE recurring_cleans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_cleans FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recurring_cleans_tenant ON recurring_cleans;
CREATE POLICY recurring_cleans_tenant ON recurring_cleans
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const cleanPhasesSQL = `
CREATE TABLE IF NOT EXISTS clean_phases (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	job_id UUID NOT NULL,
	phase TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending',
	completed_at TIMESTAMPTZ,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT clean_phases_phase_check CHECK (phase IN ('rough', 'final', 'premium')),
	CONSTRAINT clean_phases_status_check CHECK (status IN ('pending', 'in_progress', 'completed'))
);
CREATE INDEX IF NOT EXISTS idx_clean_phases_tenant ON clean_phases (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clean_phases_job ON clean_phases (tenant_id, job_id);
ALTER TABLE clean_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean_phases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clean_phases_tenant ON clean_phases;
CREATE POLICY clean_phases_tenant ON clean_phases
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type RecurringClean struct {
	ID             string     `json:"id"`
	CustomerID     string     `json:"customer_id,omitempty"`
	Title          string     `json:"title"`
	Frequency      string     `json:"frequency"`
	Phase          string     `json:"phase"`
	NextOccurrence *time.Time `json:"next_occurrence,omitempty"`
	Active         bool       `json:"active"`
	Notes          string     `json:"notes,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (p *Plugin) listRecurringCleans(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, customer_id, title, frequency, phase, next_occurrence, active, notes, created_at
		FROM recurring_cleans WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list recurring cleans")
	}
	defer rows.Close()

	var list []RecurringClean
	for rows.Next() {
		var rc RecurringClean
		var customerID *string
		if err := rows.Scan(&rc.ID, &customerID, &rc.Title, &rc.Frequency, &rc.Phase, &rc.NextOccurrence, &rc.Active, &rc.Notes, &rc.CreatedAt); err != nil {
			return err
		}
		if customerID != nil {
			rc.CustomerID = *customerID
		}
		list = append(list, rc)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createRecurringClean(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		CustomerID     string     `json:"customer_id"`
		Title          string     `json:"title"`
		Frequency      string     `json:"frequency"`
		Phase          string     `json:"phase"`
		NextOccurrence *time.Time `json:"next_occurrence"`
		Notes          string     `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.Frequency == "" {
		body.Frequency = "weekly"
	}
	if body.Phase == "" {
		body.Phase = "final"
	}
	if body.Title == "" {
		body.Title = fmt.Sprintf("%s %s clean", body.Frequency, body.Phase)
	}
	if !isValidPhase(body.Phase) {
		return fiber.NewError(400, "phase must be rough, final, or premium")
	}
	if !isValidFrequency(body.Frequency) {
		return fiber.NewError(400, "frequency must be weekly, biweekly, or monthly")
	}

	id := uuid.New().String()
	var customerID *string
	if body.CustomerID != "" {
		customerID = &body.CustomerID
	}
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO recurring_cleans (id, tenant_id, customer_id, title, frequency, phase, next_occurrence, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING created_at
	`, id, tid, customerID, body.Title, body.Frequency, body.Phase, body.NextOccurrence, body.Notes).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create recurring clean")
	}
	return c.Status(201).JSON(RecurringClean{
		ID: id, CustomerID: body.CustomerID, Title: body.Title,
		Frequency: body.Frequency, Phase: body.Phase, NextOccurrence: body.NextOccurrence,
		Active: true, Notes: body.Notes, CreatedAt: createdAt,
	})
}

func (p *Plugin) getRecurringClean(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var rc RecurringClean
	var customerID *string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, customer_id, title, frequency, phase, next_occurrence, active, notes, created_at
		FROM recurring_cleans WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&rc.ID, &customerID, &rc.Title, &rc.Frequency, &rc.Phase, &rc.NextOccurrence, &rc.Active, &rc.Notes, &rc.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "recurring clean not found")
	}
	if customerID != nil {
		rc.CustomerID = *customerID
	}
	return c.JSON(rc)
}

func (p *Plugin) updateRecurringClean(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Title          *string    `json:"title"`
		Frequency      *string    `json:"frequency"`
		Phase          *string    `json:"phase"`
		NextOccurrence *time.Time `json:"next_occurrence"`
		Active         *bool      `json:"active"`
		Notes          *string    `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.Phase != nil && !isValidPhase(*body.Phase) {
		return fiber.NewError(400, "phase must be rough, final, or premium")
	}
	if body.Frequency != nil && !isValidFrequency(*body.Frequency) {
		return fiber.NewError(400, "frequency must be weekly, biweekly, or monthly")
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE recurring_cleans SET
			title = COALESCE($3, title),
			frequency = COALESCE($4, frequency),
			phase = COALESCE($5, phase),
			next_occurrence = COALESCE($6, next_occurrence),
			active = COALESCE($7, active),
			notes = COALESCE($8, notes),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Title, body.Frequency, body.Phase, body.NextOccurrence, body.Active, body.Notes)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "recurring clean not found")
	}
	return p.getRecurringClean(c)
}

type CleanPhase struct {
	ID          string     `json:"id"`
	JobID       string     `json:"job_id"`
	Phase       string     `json:"phase"`
	Status      string     `json:"status"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Notes       string     `json:"notes,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (p *Plugin) listCleanPhases(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	jobID := c.Query("job_id")
	q := `
		SELECT id, job_id, phase, status, completed_at, notes, created_at
		FROM clean_phases WHERE tenant_id = $1`
	args := []interface{}{tid}
	if jobID != "" {
		q += ` AND job_id = $2`
		args = append(args, jobID)
	}
	q += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := p.pool.Query(c.UserContext(), q, args...)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list clean phases")
	}
	defer rows.Close()

	var list []CleanPhase
	for rows.Next() {
		var cp CleanPhase
		if err := rows.Scan(&cp.ID, &cp.JobID, &cp.Phase, &cp.Status, &cp.CompletedAt, &cp.Notes, &cp.CreatedAt); err != nil {
			return err
		}
		list = append(list, cp)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createCleanPhase(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		JobID  string `json:"job_id"`
		Phase  string `json:"phase"`
		Notes  string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil || body.JobID == "" || body.Phase == "" {
		return fiber.NewError(400, "job_id and phase required")
	}
	if !isValidPhase(body.Phase) {
		return fiber.NewError(400, "phase must be rough, final, or premium")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO clean_phases (id, tenant_id, job_id, phase, notes)
		VALUES ($1, $2, $3, $4, $5) RETURNING created_at
	`, id, tid, body.JobID, body.Phase, body.Notes).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create clean phase")
	}
	return c.Status(201).JSON(CleanPhase{
		ID: id, JobID: body.JobID, Phase: body.Phase, Status: "pending",
		Notes: body.Notes, CreatedAt: createdAt,
	})
}

func (p *Plugin) getCleanPhase(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var cp CleanPhase
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, job_id, phase, status, completed_at, notes, created_at
		FROM clean_phases WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&cp.ID, &cp.JobID, &cp.Phase, &cp.Status, &cp.CompletedAt, &cp.Notes, &cp.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "clean phase not found")
	}
	return c.JSON(cp)
}

func (p *Plugin) updateCleanPhase(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Status      *string    `json:"status"`
		CompletedAt *time.Time `json:"completed_at"`
		Notes       *string    `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.Status != nil && *body.Status != "pending" && *body.Status != "in_progress" && *body.Status != "completed" {
		return fiber.NewError(400, "status must be pending, in_progress, or completed")
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE clean_phases SET
			status = COALESCE($3, status),
			completed_at = COALESCE($4, completed_at),
			notes = COALESCE($5, notes),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Status, body.CompletedAt, body.Notes)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "clean phase not found")
	}
	return p.getCleanPhase(c)
}

func isValidPhase(phase string) bool {
	return phase == "rough" || phase == "final" || phase == "premium"
}

func isValidFrequency(freq string) bool {
	return freq == "weekly" || freq == "biweekly" || freq == "monthly"
}
