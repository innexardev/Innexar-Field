package middleware

import (
	"errors"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RejectSuspendedTenant blocks API access when the tenant is suspended.
func RejectSuspendedTenant(pool *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tid, ok := c.Locals("tenant_id").(string)
		if !ok || tid == "" {
			return c.Next()
		}
		suspended, err := tenant.IsSuspended(c.UserContext(), pool, tid)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "tenant status check failed")
		}
		if suspended {
			return fiber.NewError(fiber.StatusForbidden, tenant.ErrSuspended.Error())
		}
		return c.Next()
	}
}

// IsTenantSuspended reports whether err indicates a suspended tenant.
func IsTenantSuspended(err error) bool {
	return errors.Is(err, tenant.ErrSuspended)
}
