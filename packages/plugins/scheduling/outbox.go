package scheduling

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/fieldforge/fieldforge/packages/core/events"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const eventQuoteAccepted = "estimating.quote.accepted"

type quoteAcceptedPayload struct {
	EstimateID string `json:"estimate_id"`
}

// RegisterOutboxHandlers wires scheduling consumers on the domain event poller.
func (p *Plugin) RegisterOutboxHandlers(poller *events.Poller) {
	poller.RegisterHandler(eventQuoteAccepted, p.handleQuoteAccepted)
}

func (p *Plugin) handleQuoteAccepted(ctx context.Context, tenantID, _ string, payload json.RawMessage) error {
	var body quoteAcceptedPayload
	if err := json.Unmarshal(payload, &body); err != nil {
		return fmt.Errorf("quote accepted payload: %w", err)
	}
	if body.EstimateID == "" {
		return fmt.Errorf("quote accepted payload: estimate_id required")
	}

	tenantCtx := tenant.WithID(context.Background(), tenantID)

	var title string
	var customerID *string
	err := p.pool.QueryRow(tenantCtx, `
		SELECT title, customer_id::text
		FROM estimates
		WHERE id = $1 AND tenant_id = $2 AND status = 'accepted'
	`, body.EstimateID, tenantID).Scan(&title, &customerID)
	if err != nil {
		return fmt.Errorf("load accepted estimate %s: %w", body.EstimateID, err)
	}

	var existingID string
	err = p.pool.QueryRow(tenantCtx, `
		SELECT id FROM jobs WHERE tenant_id = $1 AND estimate_id = $2
	`, tenantID, body.EstimateID).Scan(&existingID)
	if err == nil {
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("check existing job for estimate %s: %w", body.EstimateID, err)
	}

	jobID := uuid.New().String()
	var cust any
	if customerID != nil && *customerID != "" {
		cust = *customerID
	}
	_, err = p.pool.Exec(tenantCtx, `
		INSERT INTO jobs (id, tenant_id, customer_id, estimate_id, title, status)
		VALUES ($1, $2, $3, $4, $5, 'draft')
	`, jobID, tenantID, cust, body.EstimateID, title)
	if err != nil {
		return fmt.Errorf("create draft job for estimate %s: %w", body.EstimateID, err)
	}
	return nil
}
