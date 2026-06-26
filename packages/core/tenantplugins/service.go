package tenantplugins

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Service reads tenant plugin enablement from tenant_plugins.
type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// EnabledIDs returns plugin IDs enabled for the tenant.
func (s *Service) EnabledIDs(ctx context.Context, tenantID string) ([]string, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT plugin_id FROM tenant_plugins
		WHERE tenant_id = $1 AND enabled = true
		ORDER BY plugin_id
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list tenant plugins: %w", err)
	}
	defer rows.Close()

	var ids = make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// EnabledSet returns a set of enabled plugin IDs for the tenant.
func (s *Service) EnabledSet(ctx context.Context, tenantID string) (map[string]bool, error) {
	ids, err := s.EnabledIDs(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set, nil
}

// IsEnabled reports whether a plugin is enabled for the tenant.
func (s *Service) IsEnabled(ctx context.Context, tenantID, pluginID string) (bool, error) {
	var enabled bool
	err := s.pool.QueryRow(ctx, `
		SELECT enabled FROM tenant_plugins
		WHERE tenant_id = $1 AND plugin_id = $2
	`, tenantID, pluginID).Scan(&enabled)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check tenant plugin: %w", err)
	}
	return enabled, nil
}
