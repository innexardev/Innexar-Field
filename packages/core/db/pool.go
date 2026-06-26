package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool wraps pgxpool with tenant session helpers.
type Pool struct {
	*pgxpool.Pool
}

func Connect(ctx context.Context, databaseURL string) (*Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	cfg.BeforeAcquire = func(ctx context.Context, conn *pgx.Conn) bool {
		if tenant.IsWorker(ctx) {
			_, err := conn.Exec(ctx, `SELECT set_config('app.worker', 'true', false)`)
			return err == nil
		}
		tid, ok := tenant.ID(ctx)
		if !ok {
			return true
		}
		_, err := conn.Exec(ctx, `SELECT set_config('app.tenant_id', $1, false)`, tid)
		return err == nil
	}
	cfg.AfterRelease = func(conn *pgx.Conn) bool {
		_, _ = conn.Exec(context.Background(), `SELECT set_config('app.tenant_id', '', false)`)
		_, _ = conn.Exec(context.Background(), `SELECT set_config('app.worker', '', false)`)
		return true
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return &Pool{Pool: pool}, nil
}

// WithTenant runs fn inside a transaction with RLS session variable set.
func (p *Pool) WithTenant(ctx context.Context, tenantID string, fn func(tx pgx.Tx) error) error {
	tx, err := p.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "SELECT set_config('app.tenant_id', $1, true)", tenantID); err != nil {
		return fmt.Errorf("set tenant: %w", err)
	}
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// RunMigrations applies SQL migrations in order.
func (p *Pool) RunMigrations(ctx context.Context, migrations []struct {
	Version int
	Name    string
	UpSQL   string
}) error {
	_, err := p.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INT PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	if err := p.repairAttributionV13Collision(ctx); err != nil {
		return err
	}

	for _, m := range migrations {
		var exists bool
		err := p.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", m.Version).Scan(&exists)
		if err != nil {
			return err
		}
		if exists {
			continue
		}
		if err := p.WithTenant(ctx, "00000000-0000-0000-0000-000000000000", func(tx pgx.Tx) error {
			if _, err := tx.Exec(ctx, m.UpSQL); err != nil {
				return fmt.Errorf("migration %d %s: %w", m.Version, m.Name, err)
			}
			_, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", m.Version, m.Name)
			return err
		}); err != nil {
			return err
		}
	}
	return nil
}

// repairAttributionV13Collision frees version 13 when an older build recorded
// tenant_signup_attribution there instead of platform_admin.
func (p *Pool) repairAttributionV13Collision(ctx context.Context) error {
	var name string
	err := p.QueryRow(ctx, `SELECT name FROM schema_migrations WHERE version = 13`).Scan(&name)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	if name != "tenant_signup_attribution" {
		return nil
	}
	_, err = p.Exec(ctx, `DELETE FROM schema_migrations WHERE version = 13 AND name = 'tenant_signup_attribution'`)
	return err
}
