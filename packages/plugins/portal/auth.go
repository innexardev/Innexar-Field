package portal

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const magicLinkTTL = 15 * time.Minute

type CustomerSession struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email,omitempty"`
	Phone       string `json:"phone,omitempty"`
	TenantID    string `json:"tenant_id"`
	CompanyName string `json:"company_name,omitempty"`
}

func newMagicToken() string {
	return strings.ReplaceAll(uuid.New().String(), "-", "")
}

func (p *Plugin) requestMagicLink(c *fiber.Ctx) error {
	var body struct {
		Email      string `json:"email"`
		TenantSlug string `json:"tenant_slug"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	slug := strings.TrimSpace(strings.ToLower(body.TenantSlug))
	if email == "" || slug == "" {
		return fiber.NewError(400, "email and tenant_slug required")
	}

	resp := fiber.Map{
		"message": "If an account exists for this email, a sign-in link was sent.",
	}

	var tenantID, customerID string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT t.id::text, c.id::text
		FROM tenants t
		JOIN customers c ON c.tenant_id = t.id
		WHERE t.slug = $1 AND LOWER(TRIM(c.email)) = $2
		LIMIT 1
	`, slug, email).Scan(&tenantID, &customerID)
	if err != nil {
		return c.JSON(resp)
	}

	token := newMagicToken()
	expiresAt := time.Now().UTC().Add(magicLinkTTL)
	tctx := tenant.WithID(c.UserContext(), tenantID)
	_, err = p.pool.Exec(tctx, `
		INSERT INTO portal_magic_links (id, tenant_id, customer_id, token, email, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, uuid.New().String(), tenantID, customerID, token, email, expiresAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create sign-in link")
	}

	loginPath := "/portal/login?token=" + token
	if p.cfg != nil {
		if skipEmail, ok := p.cfg.Debug.Features["skip_email_send"].(bool); ok && skipEmail {
		log.Printf("portal magic link (skip_email_send): tenant=%s customer=%s email=%s url=%s",
			tenantID, customerID, email, loginPath)
		resp["dev_login_url"] = loginPath
		resp["dev_token"] = token
		}
	}

	return c.JSON(resp)
}

func (p *Plugin) verifyMagicLink(c *fiber.Ctx) error {
	var body struct {
		Token string `json:"token"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	token := strings.TrimSpace(body.Token)
	if token == "" {
		return fiber.NewError(400, "token required")
	}

	var (
		linkID, tenantID, customerID, email string
		expiresAt                           time.Time
		usedAt                              *time.Time
	)
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id::text, tenant_id::text, customer_id::text, email, expires_at, used_at
		FROM portal_magic_links
		WHERE token = $1
	`, token).Scan(&linkID, &tenantID, &customerID, &email, &expiresAt, &usedAt)
	if err != nil {
		return fiber.NewError(401, "invalid or expired sign-in link")
	}
	if usedAt != nil || time.Now().UTC().After(expiresAt) {
		return fiber.NewError(401, "invalid or expired sign-in link")
	}

	tctx := tenant.WithID(c.UserContext(), tenantID)
	tag, err := p.pool.Exec(tctx, `
		UPDATE portal_magic_links SET used_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND used_at IS NULL
	`, linkID, tenantID)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(401, "invalid or expired sign-in link")
	}

	customer, err := p.loadCustomer(c.UserContext(), tenantID, customerID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load customer")
	}

	jwt, err := p.authSvc.IssueCustomerToken(customerID, tenantID, email)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to issue session")
	}

	return c.JSON(fiber.Map{
		"token":    jwt,
		"customer": customer,
	})
}

func (p *Plugin) getMe(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())
	customer, err := p.loadCustomer(c.UserContext(), tid, cid)
	if err != nil {
		return fiber.NewError(404, "customer not found")
	}
	return c.JSON(customer)
}

func (p *Plugin) loadCustomer(ctx context.Context, tenantID, customerID string) (*CustomerSession, error) {
	tctx := tenant.WithID(ctx, tenantID)
	var session CustomerSession
	err := p.pool.QueryRow(tctx, `
		SELECT id::text, name, COALESCE(email, ''), COALESCE(phone, ''), tenant_id::text
		FROM customers
		WHERE id = $1 AND tenant_id = $2
	`, customerID, tenantID).Scan(&session.ID, &session.Name, &session.Email, &session.Phone, &session.TenantID)
	if err != nil {
		return nil, err
	}
	_ = p.pool.QueryRow(ctx, `SELECT name FROM tenants WHERE id = $1`, tenantID).Scan(&session.CompanyName)
	return &session, nil
}
