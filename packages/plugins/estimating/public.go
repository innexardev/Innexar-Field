package estimating

import (
	"context"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// PublicQuote is the client-facing estimate view (no internal IDs).
type PublicQuote struct {
	Title         string         `json:"title"`
	Status        string         `json:"status"`
	SubtotalCents int64          `json:"subtotal_cents"`
	TotalCents    int64          `json:"total_cents"`
	CompanyName   string         `json:"company_name"`
	CustomerName  string         `json:"customer_name,omitempty"`
	Lines         []EstimateLine `json:"lines"`
	CreatedAt     time.Time      `json:"created_at"`
}

func newPublicToken() string {
	return strings.ReplaceAll(uuid.New().String(), "-", "")
}

func (p *Plugin) RegisterPublicRoutes(router fiber.Router, rl fiber.Handler) {
	quotes := router.Group("/quotes", rl)
	quotes.Get("/:token", p.getPublicQuote)
	quotes.Post("/:token/accept", p.acceptPublicQuote)
}

func (p *Plugin) withPublicToken(ctx context.Context, token string, fn func(tx pgx.Tx) error) error {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SELECT set_config('app.public_token', $1, true)`, token); err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (p *Plugin) getPublicQuote(c *fiber.Ctx) error {
	token := strings.TrimSpace(c.Params("token"))
	if token == "" {
		return fiber.NewError(400, "token required")
	}

	var (
		estimateID string
		tenantID   string
		customerID string
		quote      PublicQuote
	)

	err := p.withPublicToken(c.UserContext(), token, func(tx pgx.Tx) error {
		return tx.QueryRow(c.UserContext(), `
			SELECT id::text, tenant_id::text, COALESCE(customer_id::text, ''),
			       title, status, subtotal_cents, total_cents, created_at
			FROM estimates
			WHERE public_token = $1 AND status IN ('sent', 'accepted', 'rejected')
		`, token).Scan(
			&estimateID, &tenantID, &customerID,
			&quote.Title, &quote.Status, &quote.SubtotalCents, &quote.TotalCents, &quote.CreatedAt,
		)
	})
	if err != nil {
		return fiber.NewError(404, "quote not found")
	}

	_ = p.pool.QueryRow(c.UserContext(), `SELECT name FROM tenants WHERE id = $1`, tenantID).Scan(&quote.CompanyName)

	if customerID != "" {
		tctx := tenant.WithID(c.UserContext(), tenantID)
		_ = p.pool.QueryRow(tctx, `
			SELECT name FROM customers WHERE id = $1 AND tenant_id = $2
		`, customerID, tenantID).Scan(&quote.CustomerName)
	}

	err = p.withPublicToken(c.UserContext(), token, func(tx pgx.Tx) error {
		rows, err := tx.Query(c.UserContext(), `
			SELECT id, description, quantity, unit_price_cents
			FROM estimate_line_items
			WHERE estimate_id = $1
			ORDER BY created_at
		`, estimateID)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var line EstimateLine
			if err := rows.Scan(&line.ID, &line.Description, &line.Quantity, &line.UnitPriceCents); err != nil {
				return err
			}
			quote.Lines = append(quote.Lines, line)
		}
		return rows.Err()
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load quote")
	}

	if quote.Lines == nil {
		quote.Lines = []EstimateLine{}
	}
	return c.JSON(quote)
}

func (p *Plugin) acceptPublicQuote(c *fiber.Ctx) error {
	token := strings.TrimSpace(c.Params("token"))
	if token == "" {
		return fiber.NewError(400, "token required")
	}

	var estimateID, tenantID string
	err := p.withPublicToken(c.UserContext(), token, func(tx pgx.Tx) error {
		return tx.QueryRow(c.UserContext(), `
			SELECT id::text, tenant_id::text
			FROM estimates
			WHERE public_token = $1 AND status = 'sent'
		`, token).Scan(&estimateID, &tenantID)
	})
	if err != nil {
		return fiber.NewError(404, "quote not found or already finalized")
	}

	tctx := tenant.WithID(c.UserContext(), tenantID)
	tag, err := p.pool.Exec(tctx, `
		UPDATE estimates SET status = 'accepted', updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'sent'
	`, estimateID, tenantID)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(400, "cannot accept")
	}

	_ = p.bus.Publish(tctx, tenantID, "estimating.quote.accepted", map[string]string{
		"estimate_id": estimateID,
		"source":      "client_portal",
	})

	return c.JSON(fiber.Map{"status": "accepted"})
}
