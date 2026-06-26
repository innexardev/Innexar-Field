package featureflags

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

type tenantLoader func(ctx context.Context, tenantID string) (map[string]bool, error)

// Service resolves feature flags by merging global config with per-tenant overrides.
type Service struct {
	global map[string]bool
	load   tenantLoader
}

// NewService loads tenant overrides from PostgreSQL.
func NewService(pool *pgxpool.Pool, cfg *config.AppConfig) *Service {
	return NewServiceWithLoader(cfg, pgxLoader(pool))
}

// NewServiceWithLoader is used in tests with a stub loader.
func NewServiceWithLoader(cfg *config.AppConfig, load tenantLoader) *Service {
	global := make(map[string]bool, len(cfg.Features))
	for k, v := range cfg.Features {
		global[k] = v
	}
	return &Service{global: global, load: load}
}

// IsEnabled reports whether a flag is on for the tenant (tenant JSON overrides global config).
func (s *Service) IsEnabled(ctx context.Context, tenantID, flag string) (bool, error) {
	tenantFlags, err := s.load(ctx, tenantID)
	if err != nil {
		return false, err
	}
	if v, ok := tenantFlags[flag]; ok {
		return v, nil
	}
	if v, ok := s.global[flag]; ok {
		return v, nil
	}
	return false, nil
}

// Resolved returns merged flags for a tenant (tenant overrides win).
func (s *Service) Resolved(ctx context.Context, tenantID string) (map[string]bool, error) {
	out := make(map[string]bool, len(s.global))
	for k, v := range s.global {
		out[k] = v
	}
	overrides, err := s.load(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	for k, v := range overrides {
		out[k] = v
	}
	return out, nil
}

// DefaultsJSON serializes global feature defaults for tenant provisioning.
func (s *Service) DefaultsJSON() ([]byte, error) {
	return json.Marshal(s.global)
}

func pgxLoader(pool *pgxpool.Pool) tenantLoader {
	return func(ctx context.Context, tenantID string) (map[string]bool, error) {
		var raw []byte
		err := pool.QueryRow(ctx, `SELECT feature_flags FROM tenants WHERE id = $1`, tenantID).Scan(&raw)
		if err != nil {
			return nil, fmt.Errorf("load tenant feature flags: %w", err)
		}
		if len(raw) == 0 || string(raw) == "{}" || string(raw) == "null" {
			return map[string]bool{}, nil
		}
		var flags map[string]bool
		if err := json.Unmarshal(raw, &flags); err != nil {
			return nil, fmt.Errorf("parse tenant feature flags: %w", err)
		}
		if flags == nil {
			return map[string]bool{}, nil
		}
		return flags, nil
	}
}
