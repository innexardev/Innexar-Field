package reports

import (
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes mounts reporting endpoints on the protected /api/v1 router.
func RegisterRoutes(router fiber.Router, pool *pgxpool.Pool) {
	svc := NewService(pool)
	h := &handlers{svc: svc}

	router.Get("/reports/kpis", h.listKpis)
	router.Get("/reports/owner", h.ownerDashboard)
	router.Get("/reports/dispatcher", h.dispatcherDashboard)
	router.Get("/reports/accountant", h.accountantDashboard)
	router.Get("/reports/pl", h.profitAndLoss)
	router.Get("/reports/cash-flow", h.cashFlow)
	router.Get("/reports/wip", h.workInProgress)
}

type handlers struct {
	svc *Service
}

func (h *handlers) tenantID(c *fiber.Ctx) (string, error) {
	tid, ok := tenant.ID(c.UserContext())
	if !ok || tid == "" {
		if locals, ok := c.Locals("tenant_id").(string); ok && locals != "" {
			return locals, nil
		}
		return "", fiber.NewError(fiber.StatusUnauthorized, "tenant_id required")
	}
	return tid, nil
}

func (h *handlers) load(c *fiber.Ctx) (TenantMetrics, string, error) {
	tid, err := h.tenantID(c)
	if err != nil {
		return TenantMetrics{}, "", err
	}
	m, err := h.svc.LoadMetrics(c.UserContext(), tid)
	if err != nil {
		return TenantMetrics{}, "", fiber.NewError(fiber.StatusInternalServerError, "failed to load report metrics")
	}
	source := "stub"
	if m.HasLiveData() {
		source = "live"
	}
	return m, source, nil
}

func (h *handlers) listKpis(c *fiber.Ctx) error {
	m, source, err := h.load(c)
	if err != nil {
		return err
	}
	data := stubKpis()
	if source == "live" {
		data = liveKpis(m)
	}
	return c.JSON(fiber.Map{"data": data, "source": source})
}

func (h *handlers) ownerDashboard(c *fiber.Ctx) error {
	m, source, err := h.load(c)
	if err != nil {
		return err
	}
	data := stubOwnerDashboard()
	if source == "live" {
		data = liveOwnerDashboard(m)
	}
	return c.JSON(fiber.Map{"data": data, "source": source})
}

func (h *handlers) dispatcherDashboard(c *fiber.Ctx) error {
	m, source, err := h.load(c)
	if err != nil {
		return err
	}
	data := stubDispatcherDashboard()
	if source == "live" {
		data = liveDispatcherDashboard(m)
	}
	return c.JSON(fiber.Map{"data": data, "source": source})
}

func (h *handlers) accountantDashboard(c *fiber.Ctx) error {
	m, source, err := h.load(c)
	if err != nil {
		return err
	}
	data := stubAccountantDashboard()
	if source == "live" {
		tid, _ := h.tenantID(c)
		items, loadErr := h.svc.LoadPendingExpenses(c.UserContext(), tid, 10)
		if loadErr != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load pending expenses")
		}
		data = liveAccountantDashboard(m, items)
	}
	return c.JSON(fiber.Map{"data": data, "source": source})
}

func (h *handlers) profitAndLoss(c *fiber.Ctx) error {
	m, source, err := h.load(c)
	if err != nil {
		return err
	}
	data := stubProfitAndLoss()
	if source == "live" {
		data = liveProfitAndLoss(m)
	}
	return c.JSON(fiber.Map{"data": data, "source": source})
}

func (h *handlers) cashFlow(c *fiber.Ctx) error {
	m, source, err := h.load(c)
	if err != nil {
		return err
	}
	data := stubCashFlow()
	if source == "live" {
		data = liveCashFlow(m)
	}
	return c.JSON(fiber.Map{"data": data, "source": source})
}

func (h *handlers) workInProgress(c *fiber.Ctx) error {
	m, source, err := h.load(c)
	if err != nil {
		return err
	}
	data := stubWIP()
	if source == "live" {
		data = liveWIP(m)
	}
	return c.JSON(fiber.Map{"data": data, "source": source})
}
