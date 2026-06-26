package onboarding

import (
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts authenticated onboarding endpoints under /onboarding.
func RegisterRoutes(protected fiber.Router, svc *Service) {
	g := protected.Group("/onboarding")

	g.Get("/status", func(c *fiber.Ctx) error {
		tenantID, err := tenantID(c)
		if err != nil {
			return fiber.NewError(401, err.Error())
		}
		status, err := svc.GetStatus(c.UserContext(), tenantID)
		if err != nil {
			return fiber.NewError(404, err.Error())
		}
		return c.JSON(status)
	})

	g.Post("/industry", func(c *fiber.Ctx) error {
		tenantID, err := tenantID(c)
		if err != nil {
			return fiber.NewError(401, err.Error())
		}
		var req struct {
			IndustryPacks []string `json:"industry_packs"`
			IndustryPack  string   `json:"industry_pack"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		packs := req.IndustryPacks
		if len(packs) == 0 && req.IndustryPack != "" {
			packs = []string{req.IndustryPack}
		}
		status, err := svc.SaveIndustry(c.UserContext(), tenantID, packs)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})

	g.Post("/profile", func(c *fiber.Ctx) error {
		tenantID, err := tenantID(c)
		if err != nil {
			return fiber.NewError(401, err.Error())
		}
		var profile Profile
		if err := c.BodyParser(&profile); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		status, err := svc.SaveProfile(c.UserContext(), tenantID, profile)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})

	g.Get("/modules/preview", func(c *fiber.Ctx) error {
		tenantID, err := tenantID(c)
		if err != nil {
			return fiber.NewError(401, err.Error())
		}
		preview, err := svc.ModulesPreview(c.UserContext(), tenantID)
		if err != nil {
			return fiber.NewError(404, err.Error())
		}
		return c.JSON(fiber.Map{"data": preview})
	})

	g.Patch("/modules", func(c *fiber.Ctx) error {
		tenantID, err := tenantID(c)
		if err != nil {
			return fiber.NewError(401, err.Error())
		}
		var req struct {
			Modules        []string `json:"modules"`
			EnabledModules []string `json:"enabled_modules"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		modules := req.Modules
		if len(modules) == 0 {
			modules = req.EnabledModules
		}
		status, err := svc.UpdateModules(c.UserContext(), tenantID, modules)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})

	g.Post("/complete", func(c *fiber.Ctx) error {
		tenantID, err := tenantID(c)
		if err != nil {
			return fiber.NewError(401, err.Error())
		}
		status, nav, err := svc.Complete(c.UserContext(), tenantID)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(fiber.Map{
			"onboarding": status,
			"nav":        fiber.Map{"data": nav},
		})
	})

	g.Post("/skip-setup", func(c *fiber.Ctx) error {
		tenantID, err := tenantID(c)
		if err != nil {
			return fiber.NewError(401, err.Error())
		}
		status, err := svc.SkipSetup(c.UserContext(), tenantID)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})

	g.Post("/billing/complete", func(c *fiber.Ctx) error {
		tenantID, err := tenantID(c)
		if err != nil {
			return fiber.NewError(401, err.Error())
		}
		status, err := svc.CompleteBilling(c.UserContext(), tenantID)
		if err != nil {
			return fiber.NewError(400, err.Error())
		}
		return c.JSON(status)
	})
}

func tenantID(c *fiber.Ctx) (string, error) {
	tid, ok := c.Locals("tenant_id").(string)
	if !ok || tid == "" {
		return "", fiber.NewError(fiber.StatusUnauthorized, "missing tenant context")
	}
	return tid, nil
}
