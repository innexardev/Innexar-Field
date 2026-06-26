package middleware

import (
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

// Auth validates JWT and injects tenant/user into Fiber locals and request context.
func Auth(authSvc *auth.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "missing bearer token")
		}
		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := authSvc.ParseToken(token)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
		}
		c.Locals("claims", claims)
		c.Locals("tenant_id", claims.TenantID)
		c.Locals("user_id", claims.UserID)

		ctx := tenant.WithID(c.UserContext(), claims.TenantID)
		ctx = tenant.WithUserID(ctx, claims.UserID)
		c.SetUserContext(ctx)
		return c.Next()
	}
}

// CustomerAuth validates customer portal JWTs and scopes context to one customer.
func CustomerAuth(authSvc *auth.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "missing bearer token")
		}
		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := authSvc.ParseToken(token)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
		}
		if claims.Role != "customer" || claims.CustomerID == "" {
			return fiber.NewError(fiber.StatusForbidden, "customer session required")
		}
		c.Locals("claims", claims)
		c.Locals("tenant_id", claims.TenantID)
		c.Locals("customer_id", claims.CustomerID)

		ctx := tenant.WithID(c.UserContext(), claims.TenantID)
		ctx = tenant.WithCustomerID(ctx, claims.CustomerID)
		c.SetUserContext(ctx)
		return c.Next()
	}
}

// OptionalAuth attaches claims when present but does not fail.
func OptionalAuth(authSvc *auth.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header != "" && strings.HasPrefix(header, "Bearer ") {
			token := strings.TrimPrefix(header, "Bearer ")
			if claims, err := authSvc.ParseToken(token); err == nil {
				c.Locals("claims", claims)
				c.Locals("tenant_id", claims.TenantID)
				ctx := tenant.WithID(c.UserContext(), claims.TenantID)
				c.SetUserContext(ctx)
			}
		}
		return c.Next()
	}
}

// RequireRole checks RBAC role from JWT claims.
func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*auth.Claims)
		if !ok {
			return fiber.NewError(fiber.StatusForbidden, "forbidden")
		}
		if !allowed[claims.Role] && claims.Role != "owner" {
			return fiber.NewError(fiber.StatusForbidden, "insufficient role")
		}
		return c.Next()
	}
}

// TenantHeader sets PostgreSQL session var for RLS on each request.
func TenantHeader() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if tid, ok := c.Locals("tenant_id").(string); ok && tid != "" {
			c.Set("X-Tenant-ID", tid)
		}
		return c.Next()
	}
}

// CORS returns configured CORS middleware origins.
func CORS(origins string) fiber.Handler {
	allowed := make([]string, 0)
	for _, o := range strings.Split(origins, ",") {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			allowed = append(allowed, trimmed)
		}
	}
	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")
		c.Set("Vary", "Origin")
		for _, o := range allowed {
			if o == "*" || o == origin {
				if origin != "" {
					c.Set("Access-Control-Allow-Origin", origin)
				} else if o == "*" {
					c.Set("Access-Control-Allow-Origin", "*")
				}
				break
			}
		}
		c.Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key")
		c.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Next()
	}
}
