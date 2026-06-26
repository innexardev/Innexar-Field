package platform

import (
	"context"
	"fmt"
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CreateSuperAdmin inserts a platform super_admin when the email is not taken.
func CreateSuperAdmin(ctx context.Context, pool *pgxpool.Pool, email, password string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return "", fmt.Errorf("email and password are required")
	}
	var exists bool
	if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM platform_admins WHERE email = $1)`, email).Scan(&exists); err != nil {
		return "", fmt.Errorf("check platform admin: %w", err)
	}
	if exists {
		return "", fmt.Errorf("platform admin %q already exists", email)
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	id := uuid.New().String()
	_, err = pool.Exec(ctx, `
		INSERT INTO platform_admins (id, email, password_hash, role)
		VALUES ($1, $2, $3, 'super_admin')
	`, id, email, hash)
	if err != nil {
		return "", fmt.Errorf("insert platform admin: %w", err)
	}
	return id, nil
}
