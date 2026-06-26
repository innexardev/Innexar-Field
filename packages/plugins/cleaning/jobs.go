package cleaning

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"encoding/json"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const cleanChecklistsSQL = `
CREATE TABLE IF NOT EXISTS clean_checklists (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	job_id UUID NOT NULL,
	phase TEXT NOT NULL DEFAULT 'final',
	items JSONB NOT NULL DEFAULT '[]',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT clean_checklists_phase_check CHECK (phase IN ('rough', 'final', 'premium')),
	CONSTRAINT clean_checklists_job_unique UNIQUE (tenant_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_clean_checklists_tenant ON clean_checklists (tenant_id);
ALTER TABLE clean_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean_checklists FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clean_checklists_tenant ON clean_checklists;
CREATE POLICY clean_checklists_tenant ON clean_checklists
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

var checklistTemplates = map[string][]string{
	"rough": {
		"Remove debris",
		"Sweep floors",
		"Wipe surfaces",
		"Empty trash",
	},
	"final": {
		"Deep clean bathrooms",
		"Kitchen surfaces",
		"Vacuum all rooms",
		"Mop hard floors",
		"Final walkthrough",
	},
	"premium": {
		"Deep clean bathrooms",
		"Kitchen surfaces",
		"Vacuum all rooms",
		"Mop hard floors",
		"Windows interior",
		"Appliance detail",
		"Baseboards",
		"Final walkthrough",
	},
}

type CleanJob struct {
	ID             string     `json:"id"`
	CustomerID     string     `json:"customer_id,omitempty"`
	Title          string     `json:"title"`
	Status         string     `json:"status"`
	ScheduledAt    *time.Time `json:"scheduled_at,omitempty"`
	Phase          string     `json:"phase,omitempty"`
	ChecklistDone  int        `json:"checklist_done"`
	ChecklistTotal int        `json:"checklist_total"`
}

type ChecklistItem struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Completed bool   `json:"completed"`
}

type CleanJobDetail struct {
	ID          string          `json:"id"`
	CustomerID  string          `json:"customer_id,omitempty"`
	Title       string          `json:"title"`
	Status      string          `json:"status"`
	ScheduledAt *time.Time      `json:"scheduled_at,omitempty"`
	Notes       string          `json:"notes,omitempty"`
	Phase       string          `json:"phase"`
	Checklist   []ChecklistItem `json:"checklist"`
}

func todayRange() (time.Time, time.Time) {
	now := time.Now().UTC()
	from := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	return from, from.Add(24 * time.Hour)
}

func (p *Plugin) listTodayCleans(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	from, to := todayRange()

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT j.id, COALESCE(j.customer_id::text,''), j.title, j.status, j.scheduled_at,
			COALESCE(cp.phase, 'final'),
			COALESCE(cc.items::text, '[]')
		FROM jobs j
		LEFT JOIN LATERAL (
			SELECT phase FROM clean_phases
			WHERE tenant_id = j.tenant_id AND job_id = j.id
			ORDER BY created_at DESC LIMIT 1
		) cp ON true
		LEFT JOIN clean_checklists cc ON cc.tenant_id = j.tenant_id AND cc.job_id = j.id
		WHERE j.tenant_id = $1
		  AND j.scheduled_at IS NOT NULL
		  AND j.scheduled_at >= $2
		  AND j.scheduled_at < $3
		ORDER BY j.scheduled_at
	`, tid, from, to)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load clean schedule")
	}
	defer rows.Close()

	var list []CleanJob
	for rows.Next() {
		var job CleanJob
		var itemsJSON string
		if err := rows.Scan(&job.ID, &job.CustomerID, &job.Title, &job.Status, &job.ScheduledAt, &job.Phase, &itemsJSON); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load clean schedule")
		}
		items := parseChecklistItems(itemsJSON)
		job.ChecklistTotal = len(items)
		if job.ChecklistTotal == 0 {
			job.ChecklistTotal = len(checklistTemplates[job.Phase])
		}
		for _, item := range items {
			if item.Completed {
				job.ChecklistDone++
			}
		}
		list = append(list, job)
	}
	if list == nil {
		list = []CleanJob{}
	}
	return response.DataListWith(c, list, fiber.Map{"date": from.Format("2006-01-02")})
}

func (p *Plugin) getCleanJob(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	jobID := c.Params("id")

	var detail CleanJobDetail
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), title, status, scheduled_at, notes
		FROM jobs WHERE id = $1 AND tenant_id = $2
	`, jobID, tid).Scan(&detail.ID, &detail.CustomerID, &detail.Title, &detail.Status, &detail.ScheduledAt, &detail.Notes)
	if err != nil {
		return fiber.NewError(404, "clean job not found")
	}

	phase, err := p.resolveJobPhase(c, tid, jobID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load clean job")
	}
	detail.Phase = phase

	checklist, err := p.ensureChecklist(c, tid, jobID, phase)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load clean job")
	}
	detail.Checklist = checklist
	return c.JSON(detail)
}

func (p *Plugin) updateCleanChecklist(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	jobID := c.Params("id")

	var body struct {
		Checklist []ChecklistItem `json:"checklist"`
	}
	if err := c.BodyParser(&body); err != nil || len(body.Checklist) == 0 {
		return fiber.NewError(400, "checklist required")
	}

	var exists bool
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT EXISTS(SELECT 1 FROM jobs WHERE id = $1 AND tenant_id = $2)
	`, jobID, tid).Scan(&exists)
	if err != nil || !exists {
		return fiber.NewError(404, "clean job not found")
	}

	phase, err := p.resolveJobPhase(c, tid, jobID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update clean checklist")
	}
	if _, err := p.ensureChecklist(c, tid, jobID, phase); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update clean checklist")
	}

	itemsJSON, err := json.Marshal(body.Checklist)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update clean checklist")
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE clean_checklists SET items = $3::jsonb, updated_at = NOW()
		WHERE tenant_id = $1 AND job_id = $2
	`, tid, jobID, string(itemsJSON))
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "checklist not found")
	}
	return c.JSON(fiber.Map{"checklist": body.Checklist})
}

func (p *Plugin) resolveJobPhase(c *fiber.Ctx, tid, jobID string) (string, error) {
	var phase string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT COALESCE(
			(SELECT phase FROM clean_phases WHERE tenant_id = $1 AND job_id = $2 ORDER BY created_at DESC LIMIT 1),
			'final'
		)
	`, tid, jobID).Scan(&phase)
	return phase, err
}

func (p *Plugin) ensureChecklist(c *fiber.Ctx, tid, jobID, phase string) ([]ChecklistItem, error) {
	var itemsJSON string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT items::text FROM clean_checklists WHERE tenant_id = $1 AND job_id = $2
	`, tid, jobID).Scan(&itemsJSON)
	if err == nil {
		items := parseChecklistItems(itemsJSON)
		if len(items) > 0 {
			return items, nil
		}
	}

	items := newChecklistFromTemplate(phase)
	raw, err := json.Marshal(items)
	if err != nil {
		return nil, err
	}

	_, err = p.pool.Exec(c.UserContext(), `
		INSERT INTO clean_checklists (id, tenant_id, job_id, phase, items)
		VALUES ($1, $2, $3, $4, $5::jsonb)
		ON CONFLICT (tenant_id, job_id) DO UPDATE SET
			phase = EXCLUDED.phase,
			items = EXCLUDED.items,
			updated_at = NOW()
	`, uuid.New().String(), tid, jobID, phase, string(raw))
	if err != nil {
		return nil, err
	}
	return items, nil
}

func newChecklistFromTemplate(phase string) []ChecklistItem {
	labels, ok := checklistTemplates[phase]
	if !ok {
		labels = checklistTemplates["final"]
	}
	items := make([]ChecklistItem, len(labels))
	for i, label := range labels {
		items[i] = ChecklistItem{
			ID:        uuid.New().String(),
			Label:     label,
			Completed: false,
		}
	}
	return items
}

func parseChecklistItems(raw string) []ChecklistItem {
	if raw == "" || raw == "[]" || raw == "null" {
		return nil
	}
	var items []ChecklistItem
	if err := json.Unmarshal([]byte(raw), &items); err != nil {
		return nil
	}
	return items
}
