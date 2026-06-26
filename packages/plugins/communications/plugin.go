package communications

import (
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/platformsettings"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct {
	pool     *pgxpool.Pool
	settings *platformsettings.Store
	cfg      *config.AppConfig
}

func New(pool *pgxpool.Pool, settings *platformsettings.Store, cfg *config.AppConfig) *Plugin {
	return &Plugin{pool: pool, settings: settings, cfg: cfg}
}

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "communications",
		Name:          "Communications",
		Version:       "1.0.0",
		Dependencies:  []string{"crm"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"communications.read", "communications.write"},
		Nav: []plugin.NavItem{
			{Label: "Email templates", Path: "/settings/templates", Icon: "mail"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, _ plugin.Deps) {
	router.Get("/templates", p.listTemplates)
	router.Post("/templates", p.createTemplate)
	router.Get("/templates/:id", p.getTemplate)
	router.Patch("/templates/:id", p.updateTemplate)
	router.Delete("/templates/:id", p.deleteTemplate)
	router.Post("/templates/:id/test-send", p.sendTestTemplate)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 200, Name: "communications_email_templates", UpSQL: emailTemplatesSQL},
	}
}

const emailTemplatesSQL = `
CREATE TABLE IF NOT EXISTS email_templates (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	slug TEXT NOT NULL,
	subject TEXT NOT NULL,
	body_html TEXT NOT NULL,
	active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates (tenant_id);
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_templates_tenant ON email_templates;
CREATE POLICY email_templates_tenant ON email_templates
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`
