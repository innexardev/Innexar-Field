package communications

import (
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type EmailTemplate struct {
	ID        string    `json:"id"`
	Slug      string    `json:"slug"`
	Subject   string    `json:"subject"`
	BodyHTML  string    `json:"body_html"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

const templateSelectCols = `
	id, slug, subject, body_html, active, created_at, updated_at
`

func (p *Plugin) listTemplates(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT `+templateSelectCols+`
		FROM email_templates
		WHERE tenant_id = $1
		ORDER BY slug
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list email templates")
	}
	defer rows.Close()

	list := make([]EmailTemplate, 0)
	for rows.Next() {
		tmpl, err := scanTemplate(rows)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list email templates")
		}
		list = append(list, tmpl)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Slug     string `json:"slug"`
		Subject  string `json:"subject"`
		BodyHTML string `json:"body_html"`
		Active   *bool  `json:"active"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	slug := normalizeSlug(body.Slug)
	if slug == "" || body.Subject == "" || body.BodyHTML == "" {
		return fiber.NewError(400, "slug, subject, and body_html required")
	}
	active := true
	if body.Active != nil {
		active = *body.Active
	}

	id := uuid.New().String()
	var tmpl EmailTemplate
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO email_templates (id, tenant_id, slug, subject, body_html, active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+templateSelectCols+`
	`, id, tid, slug, body.Subject, body.BodyHTML, active).Scan(
		&tmpl.ID, &tmpl.Slug, &tmpl.Subject, &tmpl.BodyHTML, &tmpl.Active, &tmpl.CreatedAt, &tmpl.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return fiber.NewError(409, "template slug already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create email template")
	}
	return c.Status(201).JSON(tmpl)
}

func (p *Plugin) getTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	row := p.pool.QueryRow(c.UserContext(), `
		SELECT `+templateSelectCols+`
		FROM email_templates
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid)
	tmpl, err := scanTemplate(row)
	if err != nil {
		return fiber.NewError(404, "email template not found")
	}
	return c.JSON(tmpl)
}

func (p *Plugin) updateTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Slug     *string `json:"slug"`
		Subject  *string `json:"subject"`
		BodyHTML *string `json:"body_html"`
		Active   *bool   `json:"active"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	slug := body.Slug
	if slug != nil {
		normalized := normalizeSlug(*slug)
		if normalized == "" {
			return fiber.NewError(400, "slug required")
		}
		slug = &normalized
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE email_templates SET
			slug = COALESCE($3, slug),
			subject = COALESCE($4, subject),
			body_html = COALESCE($5, body_html),
			active = COALESCE($6, active),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, slug, body.Subject, body.BodyHTML, body.Active)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return fiber.NewError(409, "template slug already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update email template")
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(404, "email template not found")
	}
	return p.getTemplate(c)
}

func (p *Plugin) deleteTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `
		DELETE FROM email_templates WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to delete email template")
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(404, "email template not found")
	}
	return c.SendStatus(204)
}

func (p *Plugin) sendTestTemplate(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		To        string            `json:"to"`
		Variables map[string]string `json:"variables"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if strings.TrimSpace(body.To) == "" {
		return fiber.NewError(400, "to required")
	}

	row := p.pool.QueryRow(c.UserContext(), `
		SELECT `+templateSelectCols+`
		FROM email_templates
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid)
	tmpl, err := scanTemplate(row)
	if err != nil {
		return fiber.NewError(404, "email template not found")
	}

	subject, html := RenderTemplate(tmpl.Subject, tmpl.BodyHTML, body.Variables)
	result, err := p.sendEmail(c.UserContext(), body.To, subject, html)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to send test email")
	}
	return c.JSON(result)
}

func scanTemplate(row interface {
	Scan(dest ...any) error
}) (EmailTemplate, error) {
	var tmpl EmailTemplate
	err := row.Scan(
		&tmpl.ID, &tmpl.Slug, &tmpl.Subject, &tmpl.BodyHTML, &tmpl.Active, &tmpl.CreatedAt, &tmpl.UpdatedAt,
	)
	return tmpl, err
}

func normalizeSlug(raw string) string {
	s := strings.TrimSpace(strings.ToLower(raw))
	s = strings.ReplaceAll(s, " ", "-")
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
