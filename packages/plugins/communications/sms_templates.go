package communications

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type SMSTemplate struct {
	ID        string    `json:"id"`
	Slug      string    `json:"slug"`
	Body      string    `json:"body"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

const smsTemplateSelectCols = `id, slug, body, active, created_at, updated_at`

const smsTemplatesSQL = `
CREATE TABLE IF NOT EXISTS sms_templates (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	slug TEXT NOT NULL,
	body TEXT NOT NULL,
	active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant ON sms_templates (tenant_id);
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sms_templates_tenant ON sms_templates;
CREATE POLICY sms_templates_tenant ON sms_templates
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

func (p *Plugin) listSMSTemplates(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `SELECT `+smsTemplateSelectCols+` FROM sms_templates WHERE tenant_id = $1 ORDER BY slug`, tid)
	if err != nil {
		return fiber.NewError(500, "failed to list sms templates")
	}
	defer rows.Close()
	list := make([]SMSTemplate, 0)
	for rows.Next() {
		tmpl, err := scanSMSTemplate(rows)
		if err != nil {
			return fiber.NewError(500, "failed to list sms templates")
		}
		list = append(list, tmpl)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createSMSTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Slug   string `json:"slug"`
		Body   string `json:"body"`
		Active *bool  `json:"active"`
	}
	if err := c.BodyParser(&body); err != nil || normalizeSlug(body.Slug) == "" || strings.TrimSpace(body.Body) == "" {
		return fiber.NewError(400, "slug and body required")
	}
	active := true
	if body.Active != nil {
		active = *body.Active
	}
	id := uuid.New().String()
	var tmpl SMSTemplate
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO sms_templates (id, tenant_id, slug, body, active) VALUES ($1,$2,$3,$4,$5)
		RETURNING `+smsTemplateSelectCols, id, tid, normalizeSlug(body.Slug), body.Body, active).Scan(
		&tmpl.ID, &tmpl.Slug, &tmpl.Body, &tmpl.Active, &tmpl.CreatedAt, &tmpl.UpdatedAt)
	if err != nil {
		return fiber.NewError(500, "failed to create sms template")
	}
	return c.Status(201).JSON(tmpl)
}

func (p *Plugin) getSMSTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tmpl, err := scanSMSTemplate(p.pool.QueryRow(c.UserContext(), `SELECT `+smsTemplateSelectCols+` FROM sms_templates WHERE id = $1 AND tenant_id = $2`, c.Params("id"), tid))
	if err != nil {
		return fiber.NewError(404, "sms template not found")
	}
	return c.JSON(tmpl)
}

func (p *Plugin) updateSMSTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Slug   *string `json:"slug"`
		Body   *string `json:"body"`
		Active *bool   `json:"active"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE sms_templates SET slug = COALESCE($3, slug), body = COALESCE($4, body),
			active = COALESCE($5, active), updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Slug, body.Body, body.Active)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "sms template not found")
	}
	return p.getSMSTemplate(c)
}

func (p *Plugin) deleteSMSTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `DELETE FROM sms_templates WHERE id = $1 AND tenant_id = $2`, c.Params("id"), tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "sms template not found")
	}
	return c.SendStatus(204)
}

func (p *Plugin) sendTestSMSTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		To        string            `json:"to"`
		Variables map[string]string `json:"variables"`
	}
	if err := c.BodyParser(&body); err != nil || strings.TrimSpace(body.To) == "" {
		return fiber.NewError(400, "to required")
	}
	tmpl, err := scanSMSTemplate(p.pool.QueryRow(c.UserContext(), `SELECT `+smsTemplateSelectCols+` FROM sms_templates WHERE id = $1 AND tenant_id = $2`, c.Params("id"), tid))
	if err != nil {
		return fiber.NewError(404, "sms template not found")
	}
	result, err := p.sendSMS(c.UserContext(), body.To, RenderSMSBody(tmpl.Body, body.Variables))
	if err != nil {
		return fiber.NewError(500, "failed to send test sms")
	}
	return c.JSON(result)
}

func (p *Plugin) smsStatus(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"available": p.smsAvailable(c.UserContext()), "provider": "twilio"})
}

func scanSMSTemplate(row interface{ Scan(dest ...any) error }) (SMSTemplate, error) {
	var tmpl SMSTemplate
	err := row.Scan(&tmpl.ID, &tmpl.Slug, &tmpl.Body, &tmpl.Active, &tmpl.CreatedAt, &tmpl.UpdatedAt)
	return tmpl, err
}

func RenderSMSBody(body string, vars map[string]string) string {
	merged := map[string]string{"customer_name": "Customer", "job_title": "Service visit", "scheduled_at": "soon"}
	for k, v := range vars {
		merged[k] = v
	}
	return applyVariables(body, merged)
}

func (p *Plugin) sendTemplateSMS(ctx context.Context, tenantID, slug, to string, vars map[string]string) error {
	row := p.pool.QueryRow(ctx, `SELECT `+smsTemplateSelectCols+` FROM sms_templates WHERE tenant_id = $1 AND slug = $2 AND active = true`, tenantID, slug)
	tmpl, err := scanSMSTemplate(row)
	if err != nil {
		return fmt.Errorf("load sms template %s: %w", slug, err)
	}
	_, err = p.sendSMS(ctx, to, RenderSMSBody(tmpl.Body, vars))
	return err
}
