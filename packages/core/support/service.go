package support

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSubjectRequired = errors.New("subject is required")
	ErrMessageRequired = errors.New("message is required")
)

// Ticket is the API shape returned to tenant users.
type Ticket struct {
	ID        string    `json:"id"`
	Subject   string    `json:"subject"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) List(ctx context.Context) ([]Ticket, error) {
	tid, ok := tenant.ID(ctx)
	if !ok {
		return nil, tenant.ErrMissingTenant
	}
	uid, ok := tenant.UserID(ctx)
	if !ok {
		return nil, errors.New("user_id missing from context")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, subject, message, status, created_at
		FROM tenant_support_tickets
		WHERE tenant_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT 100
	`, tid, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Ticket
	for rows.Next() {
		var t Ticket
		if err := rows.Scan(&t.ID, &t.Subject, &t.Message, &t.Status, &t.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (s *Service) Create(ctx context.Context, subject, message string) (*Ticket, error) {
	subject = strings.TrimSpace(subject)
	message = strings.TrimSpace(message)
	if subject == "" {
		return nil, ErrSubjectRequired
	}
	if message == "" {
		return nil, ErrMessageRequired
	}

	tid, ok := tenant.ID(ctx)
	if !ok {
		return nil, tenant.ErrMissingTenant
	}
	uid, ok := tenant.UserID(ctx)
	if !ok {
		return nil, errors.New("user_id missing from context")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err := s.pool.QueryRow(ctx, `
		INSERT INTO tenant_support_tickets (id, tenant_id, user_id, subject, message)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`, id, tid, uid, subject, message).Scan(&createdAt)
	if err != nil {
		return nil, err
	}

	return &Ticket{
		ID:        id,
		Subject:   subject,
		Message:   message,
		Status:    "open",
		CreatedAt: createdAt,
	}, nil
}
