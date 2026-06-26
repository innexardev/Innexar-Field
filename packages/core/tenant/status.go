package tenant

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrSuspended is returned when a tenant has been suspended by platform admin.
var ErrSuspended = errors.New("tenant suspended")

// IsSuspended reports whether the tenant has a non-null suspended_at timestamp.
func IsSuspended(ctx context.Context, pool *pgxpool.Pool, tenantID string) (bool, error) {
	var suspended bool
	err := pool.QueryRow(ctx, `
		SELECT suspended_at IS NOT NULL FROM tenants WHERE id = $1
	`, tenantID).Scan(&suspended)
	if err != nil {
		return false, err
	}
	return suspended, nil
}
