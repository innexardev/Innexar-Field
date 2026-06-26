package invoicing

import (
	"net/http/httptest"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	ffmiddleware "github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPayInvoice_RequiresPrivilegedRole(t *testing.T) {
	authSvc := auth.NewService("test-secret-32-characters-long!", 24)
	app := newInvoicingTestApp(authSvc)

	dispatcherToken, err := authSvc.IssueToken("user-1", "tenant-1", "disp@example.com", "dispatcher")
	require.NoError(t, err)

	req := httptest.NewRequest("POST", "/invoices/00000000-0000-0000-0000-000000000001/pay", nil)
	req.Header.Set("Authorization", "Bearer "+dispatcherToken)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
	_ = resp.Body.Close()
}

func newInvoicingTestApp(authSvc *auth.Service) *fiber.App {
	app := fiber.New()
	api := app.Group("", ffmiddleware.Auth(authSvc), func(c *fiber.Ctx) error {
		ctx := tenant.WithID(c.UserContext(), c.Locals("tenant_id").(string))
		c.SetUserContext(ctx)
		return c.Next()
	})
	p := New(nil, nil)
	p.RegisterRoutes(api, plugin.Deps{})
	return app
}
