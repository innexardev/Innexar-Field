package platform

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"encoding/json"
	"errors"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts platform admin API under /platform.
func RegisterRoutes(api fiber.Router, svc *Service, authSvc *auth.Service, publicRL fiber.Handler) {
	platformPublic := api.Group("/platform")
	platformPublic.Post("/auth/login", publicRL, func(c *fiber.Ctx) error {
		var req LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		res, err := svc.Login(c.UserContext(), req)
		if err != nil {
			if errors.Is(err, auth.ErrInvalidCredentials) {
				return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
			}
			return fiber.NewError(fiber.StatusInternalServerError, "login failed")
		}
		return c.JSON(res)
	})
	platformPublic.Get("/landing-content/public", publicRL, publicLandingContent(svc))
	api.Get("/public/plans", publicRL, listPublicPlans(svc))

	platformAuth := []fiber.Handler{
		middleware.Auth(authSvc),
		middleware.RequirePlatformAdmin(),
	}
	withPlatformAuth := func(h fiber.Handler) []fiber.Handler {
		return append(append([]fiber.Handler{}, platformAuth...), h)
	}

	platformPublic.Get("/auth/me", withPlatformAuth(getMe(svc))...)

	platformPublic.Get("/plans", withPlatformAuth(listPlans(svc))...)
	platformPublic.Post("/plans", withPlatformAuth(createPlan(svc))...)
	platformPublic.Get("/plans/:id", withPlatformAuth(getPlan(svc))...)
	platformPublic.Patch("/plans/:id", withPlatformAuth(updatePlan(svc))...)
	platformPublic.Delete("/plans/:id", withPlatformAuth(deletePlan(svc))...)

	platformPublic.Get("/promotions", withPlatformAuth(listPromotions(svc))...)
	platformPublic.Post("/promotions", withPlatformAuth(createPromotion(svc))...)
	platformPublic.Get("/promotions/:id", withPlatformAuth(getPromotion(svc))...)
	platformPublic.Patch("/promotions/:id", withPlatformAuth(updatePromotion(svc))...)
	platformPublic.Delete("/promotions/:id", withPlatformAuth(deletePromotion(svc))...)

	platformPublic.Get("/landing-content", withPlatformAuth(listLandingContent(svc))...)
	platformPublic.Post("/landing-content", withPlatformAuth(createLandingContent(svc))...)
	platformPublic.Patch("/landing-content/:id", withPlatformAuth(updateLandingContent(svc))...)
	platformPublic.Delete("/landing-content/:id", withPlatformAuth(deleteLandingContent(svc))...)

	platformPublic.Get("/config", withPlatformAuth(getConfig(svc))...)
	platformPublic.Patch("/config", withPlatformAuth(updateConfig(svc))...)

	platformPublic.Get("/integrations/settings", withPlatformAuth(getIntegrationsSettings(svc))...)
	platformPublic.Patch("/integrations/settings", withPlatformAuth(updateIntegrationsSettings(svc))...)

	platformPublic.Get("/billing-settings", withPlatformAuth(getBillingSettings(svc))...)
	platformPublic.Patch("/billing-settings", withPlatformAuth(updateBillingSettings(svc))...)

	platformPublic.Get("/tenants", withPlatformAuth(listTenants(svc))...)
	platformPublic.Post("/tenants", withPlatformAuth(createTenant(svc))...)
	platformPublic.Get("/tenants/:id", withPlatformAuth(getTenant(svc))...)
	platformPublic.Patch("/tenants/:id", withPlatformAuth(updateTenant(svc))...)

	platformPublic.Get("/users", withPlatformAuth(listUsers(svc))...)
	platformPublic.Post("/users", withPlatformAuth(createUser(svc))...)
	platformPublic.Get("/users/:id", withPlatformAuth(getUser(svc))...)
	platformPublic.Patch("/users/:id", withPlatformAuth(updateUser(svc))...)
	platformPublic.Delete("/users/:id", withPlatformAuth(deleteUser(svc))...)

	platformPublic.Get("/modules", withPlatformAuth(getModuleSettings(svc))...)
	platformPublic.Patch("/modules", withPlatformAuth(updateModuleSettings(svc))...)

	platformPublic.Get("/announcements", withPlatformAuth(listAnnouncements(svc))...)
	platformPublic.Post("/announcements", withPlatformAuth(createAnnouncement(svc))...)
	platformPublic.Patch("/announcements/:id", withPlatformAuth(updateAnnouncement(svc))...)
	platformPublic.Delete("/announcements/:id", withPlatformAuth(deleteAnnouncement(svc))...)

	platformPublic.Get("/stats", withPlatformAuth(getStats(svc))...)
	platformPublic.Get("/metrics", withPlatformAuth(getMetrics(svc))...)
	platformPublic.Get("/audit-log", withPlatformAuth(listAuditLog(svc))...)
}

func adminID(c *fiber.Ctx) string {
	return c.Locals("user_id").(string)
}

func getMe(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		admin, err := svc.Me(c.UserContext(), adminID(c))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load profile")
		}
		if admin == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(admin)
	}
}

func listPlans(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		list, err := svc.ListPlans(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list plans")
		}
		return response.DataList(c, list)
	}
}

func getPlan(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		p, err := svc.GetPlan(c.UserContext(), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get plan")
		}
		if p == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(p)
	}
}

func createPlan(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in PlanInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		p, err := svc.CreatePlan(c.UserContext(), adminID(c), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(p)
	}
}

func updatePlan(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in PlanInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		p, err := svc.UpdatePlan(c.UserContext(), adminID(c), c.Params("id"), in)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update plan")
		}
		if p == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(p)
	}
}

func deletePlan(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ok, err := svc.DeletePlan(c.UserContext(), adminID(c), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to delete plan")
		}
		if !ok {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}

func listPromotions(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		list, err := svc.ListPromotions(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list promotions")
		}
		return response.DataList(c, list)
	}
}

func getPromotion(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		p, err := svc.GetPromotion(c.UserContext(), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get promotion")
		}
		if p == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(p)
	}
}

func createPromotion(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in PromotionInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		p, err := svc.CreatePromotion(c.UserContext(), adminID(c), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(p)
	}
}

func updatePromotion(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in PromotionInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		p, err := svc.UpdatePromotion(c.UserContext(), adminID(c), c.Params("id"), in)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update promotion")
		}
		if p == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(p)
	}
}

func deletePromotion(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ok, err := svc.DeletePromotion(c.UserContext(), adminID(c), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to delete promotion")
		}
		if !ok {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}



func listPublicPlans(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		list, err := svc.ListPublicPlans(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list plans")
		}
		if list == nil {
			list = []PublicPlan{}
		}
		return response.DataList(c, list)
	}
}

func publicLandingContent(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		list, err := svc.ListPublicLandingContent(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load landing content")
		}
		blocks := make([]fiber.Map, 0, len(list))
		for _, b := range list {
			content := map[string]interface{}{}
			if len(b.Content) > 0 {
				_ = json.Unmarshal(b.Content, &content)
			}
			blocks = append(blocks, fiber.Map{
				"section": b.Section,
				"content": content,
			})
		}
		return c.JSON(fiber.Map{"blocks": blocks})
	}
}

func listLandingContent(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		list, err := svc.ListLandingContent(c.UserContext(), c.Query("section"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return response.DataList(c, list)
	}
}

func createLandingContent(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in LandingInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		b, err := svc.CreateLandingContent(c.UserContext(), adminID(c), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(b)
	}
}

func updateLandingContent(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in LandingInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		b, err := svc.UpdateLandingContent(c.UserContext(), adminID(c), c.Params("id"), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		if b == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(b)
	}
}

func deleteLandingContent(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ok, err := svc.DeleteLandingContent(c.UserContext(), adminID(c), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to delete landing content")
		}
		if !ok {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}

func getConfig(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		cfg, err := svc.GetConfig(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load config")
		}
		return c.JSON(cfg)
	}
}

func updateConfig(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in ConfigInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		cfg, err := svc.UpdateConfig(c.UserContext(), adminID(c), in)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update config")
		}
		return c.JSON(cfg)
	}
}

func getIntegrationsSettings(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		settings, err := svc.GetIntegrationsSettings(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load integration settings")
		}
		return c.JSON(settings)
	}
}

func updateIntegrationsSettings(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in IntegrationsSettingsInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		settings, err := svc.UpdateIntegrationsSettings(c.UserContext(), adminID(c), in)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update integration settings")
		}
		return c.JSON(settings)
	}
}

func getBillingSettings(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		settings, err := svc.GetBillingSettings(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load billing settings")
		}
		return c.JSON(settings)
	}
}

func updateBillingSettings(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in billing.BillingSettingsPatch
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		settings, err := svc.UpdateBillingSettings(c.UserContext(), adminID(c), in)
		if err != nil {
			if errors.Is(err, ErrUnknownPlan) {
				return fiber.NewError(fiber.StatusBadRequest, err.Error())
			}
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return c.JSON(settings)
	}
}

func listTenants(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		list, err := svc.ListTenants(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list tenants")
		}
		return response.DataList(c, list)
	}
}

func getTenant(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		t, err := svc.GetTenant(c.UserContext(), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get tenant")
		}
		if t == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(t)
	}
}

func createTenant(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in TenantCreateInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		t, err := svc.CreateTenant(c.UserContext(), adminID(c), in)
		if err != nil {
			if errors.Is(err, ErrUnknownPlan) {
				return fiber.NewError(fiber.StatusBadRequest, err.Error())
			}
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(t)
	}
}

func updateTenant(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in TenantPatch
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		t, err := svc.UpdateTenant(c.UserContext(), adminID(c), c.Params("id"), in)
		if err != nil {
			if errors.Is(err, ErrUnknownPlan) {
				return fiber.NewError(fiber.StatusBadRequest, err.Error())
			}
			return fiber.NewError(fiber.StatusInternalServerError, "failed to update tenant")
		}
		if t == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(t)
	}
}

func getStats(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		st, err := svc.Stats(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load stats")
		}
		return c.JSON(st)
	}
}

func getMetrics(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		m, err := svc.Metrics(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load metrics")
		}
		return c.JSON(m)
	}
}

func listAuditLog(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		limit := c.QueryInt("limit", 50)
		offset := c.QueryInt("offset", 0)
		list, err := svc.ListAuditLog(c.UserContext(), limit, offset)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list audit log")
		}
		return response.DataList(c, list)
	}
}

func listUsers(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		list, err := svc.ListUsers(c.UserContext(), c.Query("tenant_id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list users")
		}
		return response.DataList(c, list)
	}
}

func getUser(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		u, err := svc.GetUser(c.UserContext(), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get user")
		}
		if u == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(u)
	}
}

func createUser(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in UserCreateInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		u, err := svc.CreateUser(c.UserContext(), adminID(c), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(u)
	}
}

func updateUser(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in UserUpdateInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		u, err := svc.UpdateUser(c.UserContext(), adminID(c), c.Params("id"), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		if u == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(u)
	}
}

func deleteUser(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ok, err := svc.DeleteUser(c.UserContext(), adminID(c), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		if !ok {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}

func getModuleSettings(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		settings, err := svc.GetModuleSettings(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load module settings")
		}
		return c.JSON(settings)
	}
}

func updateModuleSettings(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in ModuleSettingsPatch
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		settings, err := svc.UpdateModuleSettings(c.UserContext(), adminID(c), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return c.JSON(settings)
	}
}

func listAnnouncements(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		list, err := svc.ListAnnouncements(c.UserContext())
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list announcements")
		}
		return response.DataList(c, list)
	}
}

func createAnnouncement(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in AnnouncementInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		a, err := svc.CreateAnnouncement(c.UserContext(), adminID(c), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return c.Status(fiber.StatusCreated).JSON(a)
	}
}

func updateAnnouncement(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in AnnouncementInput
		if err := c.BodyParser(&in); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid body")
		}
		a, err := svc.UpdateAnnouncement(c.UserContext(), adminID(c), c.Params("id"), in)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		if a == nil {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.JSON(a)
	}
}

func deleteAnnouncement(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ok, err := svc.DeleteAnnouncement(c.UserContext(), adminID(c), c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to delete announcement")
		}
		if !ok {
			return fiber.NewError(fiber.StatusNotFound, "not found")
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}
