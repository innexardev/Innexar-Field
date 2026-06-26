package portal

import (
	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/events"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct {
	pool    *pgxpool.Pool
	authSvc *auth.Service
	cfg     *config.AppConfig
	bus     *events.Bus
}

func New(pool *pgxpool.Pool, authSvc *auth.Service, cfg *config.AppConfig, bus *events.Bus) *Plugin {
	return &Plugin{pool: pool, authSvc: authSvc, cfg: cfg, bus: bus}
}

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "portal",
		Name:          "Client Portal",
		Version:       "1.0.0",
		Dependencies:  []string{"crm", "invoicing"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"portal.read"},
	}
}

func (p *Plugin) RegisterRoutes(_ fiber.Router, _ plugin.Deps) {}

func (p *Plugin) RegisterPublicRoutes(router fiber.Router, rl fiber.Handler) {
	authGroup := router.Group("/portal", rl)
	authGroup.Post("/login", p.requestMagicLink)
	authGroup.Post("/verify", p.verifyMagicLink)
}

func (p *Plugin) RegisterCustomerRoutes(router fiber.Router) {
	router.Get("/me", p.getMe)
	router.Patch("/me", p.updateMe)
	router.Get("/invoices", p.listInvoices)
	router.Get("/invoices/:id", p.getInvoice)
	router.Get("/payments", p.listPayments)
	router.Post("/invoices/:id/payment-intent", p.createPaymentIntent)
	router.Post("/invoices/:id/confirm-payment", p.confirmPayment)
	router.Get("/documents", p.listDocuments)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 133, Name: "portal_magic_links", UpSQL: magicLinksSQL},
		{Version: 132, Name: "invoices_customer_rls", UpSQL: invoicesCustomerRLSSQL},
	}
}

const magicLinksSQL = `
CREATE TABLE IF NOT EXISTS portal_magic_links (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
	token TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	used_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_magic_links_token ON portal_magic_links (token);
CREATE INDEX IF NOT EXISTS idx_portal_magic_links_tenant ON portal_magic_links (tenant_id);
ALTER TABLE portal_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_magic_links FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS portal_magic_links_tenant ON portal_magic_links;
CREATE POLICY portal_magic_links_tenant ON portal_magic_links
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const invoicesCustomerRLSSQL = `
DROP POLICY IF EXISTS invoices_tenant ON invoices;
CREATE POLICY invoices_tenant ON invoices USING (
	tenant_id = current_setting('app.tenant_id', true)::uuid
	AND (
		NULLIF(current_setting('app.customer_id', true), '') IS NULL
		OR customer_id::text = current_setting('app.customer_id', true)
	)
);
`
