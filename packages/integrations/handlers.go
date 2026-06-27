package integrations

import (
	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes mounts authenticated integration endpoints under /integrations.
func RegisterRoutes(protected fiber.Router, pool *pgxpool.Pool, cfg *config.AppConfig, resolver billing.SecretResolver) {
	base := NewService(pool, cfg, resolver)
	qb := newQuickBooks(cfg, base, resolver)
	av := newAvalara(cfg)
	sc := newStripeConnect(cfg, base, resolver)

	g := protected.Group("/integrations")

	g.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"data": cfg.IntegrationCatalog()})
	})

	g.Get("/status", func(c *fiber.Ctx) error {
		list, err := base.ListStatus(c.UserContext())
		if err != nil {
			return fiber.NewError(500, err.Error())
		}
		return response.DataList(c, sanitizeConnectionStatuses(list))
	})

	qbGroup := g.Group("/quickbooks")
	qbGroup.Get("/connect", func(c *fiber.Ctx) error {
		returnPath := c.Query("return_path")
		if returnPath == "" {
			returnPath = c.Query("redirect_uri")
		}
		if returnPath == "" {
			returnPath = c.Query("redirect_url")
		}
		result, err := qb.StartOAuth(c.UserContext(), returnPath)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.Redirect(result.AuthorizeURL, fiber.StatusFound)
	})
	qbGroup.Get("/oauth/start", func(c *fiber.Ctx) error {
		redirectURI := c.Query("redirect_uri")
		if redirectURI == "" {
			redirectURI = c.Query("redirect_url")
		}
		result, err := qb.StartOAuth(c.UserContext(), redirectURI)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(result)
	})
	qbGroup.Get("/oauth/callback", func(c *fiber.Ctx) error {
		st, err := qb.CompleteOAuth(c.UserContext(), c.Query("code"), c.Query("state"), c.Query("realmId"))
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(sanitizeConnectionStatus(st))
	})
	qbGroup.Post("/oauth/callback", func(c *fiber.Ctx) error {
		var req struct {
			Code    string `json:"code"`
			State   string `json:"state"`
			RealmID string `json:"realm_id"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		st, err := qb.CompleteOAuth(c.UserContext(), req.Code, req.State, req.RealmID)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(sanitizeConnectionStatus(st))
	})
	qbGroup.Post("/invoices/:id/export", func(c *fiber.Ctx) error {
		result, err := qb.ExportInvoice(c.UserContext(), c.Params("id"))
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(result)
	})
	qbGroup.Get("/status", func(c *fiber.Ctx) error {
		st, err := base.GetStatus(c.UserContext(), IDQuickBooks)
		if err != nil {
			return fiber.NewError(500, err.Error())
		}
		return c.JSON(sanitizeConnectionStatus(st))
	})
	qbGroup.Post("/disconnect", func(c *fiber.Ctx) error {
		st, err := base.Disconnect(c.UserContext(), IDQuickBooks)
		if err != nil {
			return fiber.NewError(500, err.Error())
		}
		return c.JSON(sanitizeConnectionStatus(st))
	})

	g.Post("/avalara/tax/calculate", func(c *fiber.Ctx) error {
		var req AvalaraCalculateRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		result, err := av.Calculate(c.UserContext(), req)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(result)
	})

	scGroup := g.Group("/stripe-connect")
	scGroup.Post("/onboard", func(c *fiber.Ctx) error {
		var req struct {
			ReturnPath string `json:"return_path"`
		}
		_ = c.BodyParser(&req)
		result, err := sc.StartOnboarding(c.UserContext(), req.ReturnPath)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(result)
	})
	scGroup.Post("/complete", func(c *fiber.Ctx) error {
		var req struct {
			AccountID string `json:"account_id"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		result, err := sc.CompleteOnboarding(c.UserContext(), req.AccountID)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(result)
	})
	scGroup.Get("/status", func(c *fiber.Ctx) error {
		result, err := sc.GetStatus(c.UserContext())
		if err != nil {
			return fiber.NewError(500, err.Error())
		}
		return c.JSON(result)
	})
}
