package notifications

import (
	"context"
	"errors"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("notification not found")

// Notification is the API shape returned to clients.
type Notification struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Category  string    `json:"category"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"created_at"`
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) List(ctx context.Context) ([]Notification, error) {
	tid, ok := tenant.ID(ctx)
	if !ok {
		return nil, tenant.ErrMissingTenant
	}
	uid, ok := tenant.UserID(ctx)
	if !ok {
		return nil, errors.New("user_id missing from context")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, type, title, body, read_at IS NOT NULL, created_at
		FROM notifications
		WHERE tenant_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT 100
	`, tid, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.Category, &n.Title, &n.Body, &n.Read, &n.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, n)
	}
	return list, rows.Err()
}

func (s *Service) MarkRead(ctx context.Context, id string) (*Notification, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrNotFound
	}
	tid, ok := tenant.ID(ctx)
	if !ok {
		return nil, tenant.ErrMissingTenant
	}
	uid, ok := tenant.UserID(ctx)
	if !ok {
		return nil, errors.New("user_id missing from context")
	}

	var n Notification
	err := s.pool.QueryRow(ctx, `
		UPDATE notifications
		SET read_at = COALESCE(read_at, NOW())
		WHERE id = $1 AND tenant_id = $2 AND user_id = $3
		RETURNING id, type, title, body, read_at IS NOT NULL, created_at
	`, id, tid, uid).Scan(&n.ID, &n.Category, &n.Title, &n.Body, &n.Read, &n.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &n, nil
}
