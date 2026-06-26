package invoicing

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

const eventJobCompleted = "operations.job.completed"

type jobCompletedPayload struct {
	JobID string `json:"job_id"`
}

// RegisterOutboxHandlers wires invoicing consumers on the domain event poller.
func (p *Plugin) RegisterOutboxHandlers(poller *events.Poller) {
	poller.RegisterHandler(eventJobCompleted, p.handleJobCompleted)
}

func (p *Plugin) handleJobCompleted(ctx context.Context, tenantID, _ string, payload json.RawMessage) error {
	var body jobCompletedPayload
	if err := json.Unmarshal(payload, &body); err != nil {
		return fmt.Errorf("job completed payload: %w", err)
	}
	if body.JobID == "" {
		return fmt.Errorf("job completed payload: job_id required")
	}

	tenantCtx := tenant.WithID(context.Background(), tenantID)

	var existingID string
	err := p.pool.QueryRow(tenantCtx, `
		SELECT id FROM invoices WHERE tenant_id = $1 AND job_id = $2
	`, tenantID, body.JobID).Scan(&existingID)
	if err == nil {
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("check existing invoice for job %s: %w", body.JobID, err)
	}

	var customerID *string
	err = p.pool.QueryRow(tenantCtx, `
		SELECT customer_id::text
		FROM jobs
		WHERE id = $1 AND tenant_id = $2 AND status = 'completed'
	`, body.JobID, tenantID).Scan(&customerID)
	if err != nil {
		return fmt.Errorf("load completed job %s: %w", body.JobID, err)
	}

	invoiceID := uuid.New().String()
	invoiceNumber := "INV-" + invoiceID[:8]
	var cust any
	if customerID != nil && *customerID != "" {
		cust = *customerID
	}
	_, err = p.pool.Exec(tenantCtx, `
		INSERT INTO invoices (id, tenant_id, customer_id, job_id, invoice_number, status, total_cents, due_at)
		VALUES ($1, $2, $3, $4, $5, 'draft', 0, NOW() + INTERVAL '30 days')
	`, invoiceID, tenantID, cust, body.JobID, invoiceNumber)
	if err != nil {
		return fmt.Errorf("create draft invoice for job %s: %w", body.JobID, err)
	}
	return nil
}
