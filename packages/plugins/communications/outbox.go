package communications

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
)

const eventJobScheduled = "operations.job.scheduled"

type jobScheduledPayload struct {
	JobID string `json:"job_id"`
}

func (p *Plugin) handleJobScheduled(ctx context.Context, tenantID, _ string, payload json.RawMessage) error {
	var body jobScheduledPayload
	if err := json.Unmarshal(payload, &body); err != nil {
		return fmt.Errorf("job scheduled payload: %w", err)
	}
	if body.JobID == "" {
		return fmt.Errorf("job scheduled payload: job_id required")
	}
	tenantCtx := tenant.WithID(context.Background(), tenantID)
	if err := p.seedDefaultSMSTemplates(tenantCtx, tenantID); err != nil {
		return fmt.Errorf("seed sms templates: %w", err)
	}
	var title, customerName, customerPhone string
	var scheduledAt *time.Time
	err := p.pool.QueryRow(tenantCtx, `
		SELECT j.title, COALESCE(c.name, ''), COALESCE(c.phone, ''), j.scheduled_at
		FROM jobs j
		LEFT JOIN customers c ON c.id = j.customer_id AND c.tenant_id = j.tenant_id
		WHERE j.id = $1 AND j.tenant_id = $2
	`, body.JobID, tenantID).Scan(&title, &customerName, &customerPhone, &scheduledAt)
	if err != nil {
		return fmt.Errorf("load job %s: %w", body.JobID, err)
	}
	if customerPhone == "" {
		return nil
	}
	scheduledLabel := "soon"
	if scheduledAt != nil {
		scheduledLabel = scheduledAt.Format("Mon Jan 2, 3:04 PM")
	}
	if customerName == "" {
		customerName = "there"
	}
	return p.sendTemplateSMS(tenantCtx, tenantID, "appointment-confirmation", customerPhone, map[string]string{
		"customer_name": customerName, "job_title": title, "scheduled_at": scheduledLabel,
	})
}

func (p *Plugin) seedDefaultSMSTemplates(ctx context.Context, tenantID string) error {
	defaults := []struct{ slug, body string }{
		{"appointment-confirmation", "Hi {{customer_name}}, your appointment for {{job_title}} is confirmed for {{scheduled_at}}."},
		{"job-reminder", "Reminder: {{job_title}} is scheduled for {{scheduled_at}}. Reply STOP to opt out."},
	}
	for _, d := range defaults {
		_, err := p.pool.Exec(ctx, `
			INSERT INTO sms_templates (id, tenant_id, slug, body, active)
			VALUES ($1, $2, $3, $4, true) ON CONFLICT (tenant_id, slug) DO NOTHING
		`, uuid.New().String(), tenantID, d.slug, d.body)
		if err != nil {
			return err
		}
	}
	return nil
}
