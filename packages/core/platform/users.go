package platform

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// PlatformUser is a workspace member visible to platform admins (no credentials).
type PlatformUser struct {
	ID         string `json:"id"`
	TenantID   string `json:"tenant_id"`
	TenantName string `json:"tenant_name,omitempty"`
	TenantSlug string `json:"tenant_slug,omitempty"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	CreatedAt  string `json:"created_at"`
}

// UserCreateInput provisions a tenant workspace member.
type UserCreateInput struct {
	TenantID  string `json:"tenant_id"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// UserUpdateInput updates a tenant workspace member.
type UserUpdateInput struct {
	Email     string `json:"email"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Password  string `json:"password"`
}

// ListUsers returns workspace members platform-wide or for one tenant.
func (s *Service) ListUsers(ctx context.Context, tenantID string) ([]PlatformUser, error) {
	var rows pgx.Rows
	var err error
	if tenantID != "" {
		rows, err = s.pool.Query(ctx, `SELECT * FROM platform_list_users($1::uuid)`, tenantID)
	} else {
		rows, err = s.pool.Query(ctx, `SELECT * FROM platform_list_users(NULL)`)
	}
	if err != nil {
		return nil, fmt.Errorf("list platform users: %w", err)
	}
	defer rows.Close()
	return scanPlatformUsers(rows)
}

// GetUser returns one workspace member by id.
func (s *Service) GetUser(ctx context.Context, userID string) (*PlatformUser, error) {
	row := s.pool.QueryRow(ctx, `SELECT * FROM platform_get_user($1::uuid)`, userID)
	u, err := scanPlatformUser(row)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return u, err
}

// CreateUser adds a workspace member inside a tenant (RLS via session variable).
func (s *Service) CreateUser(ctx context.Context, adminID string, in UserCreateInput) (*PlatformUser, error) {
	tenantID := strings.TrimSpace(in.TenantID)
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if tenantID == "" || email == "" || in.Password == "" {
		return nil, fmt.Errorf("tenant_id, email, and password are required")
	}
	role := strings.TrimSpace(in.Role)
	if role == "" {
		role = "admin"
	}
	if err := validateUserRole(role); err != nil {
		return nil, err
	}
	exists, err := s.tenantExists(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("tenant not found")
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return nil, err
	}
	userID := uuid.New().String()
	err = s.withTenantTx(ctx, tenantID, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `
			INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, userID, tenantID, email, hash, role, strings.TrimSpace(in.FirstName), strings.TrimSpace(in.LastName))
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	_ = s.audit(ctx, adminID, "create", "tenant_user", userID, map[string]interface{}{
		"tenant_id": tenantID,
		"email":     email,
		"role":      role,
	})
	return s.GetUser(ctx, userID)
}

// UpdateUser updates a workspace member.
func (s *Service) UpdateUser(ctx context.Context, adminID, userID string, in UserUpdateInput) (*PlatformUser, error) {
	existing, err := s.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}

	email := existing.Email
	if in.Email != "" {
		email = strings.ToLower(strings.TrimSpace(in.Email))
	}
	role := existing.Role
	if in.Role != "" {
		role = strings.TrimSpace(in.Role)
	}
	if err := validateUserRole(role); err != nil {
		return nil, err
	}
	firstName := existing.FirstName
	if in.FirstName != "" {
		firstName = strings.TrimSpace(in.FirstName)
	}
	lastName := existing.LastName
	if in.LastName != "" {
		lastName = strings.TrimSpace(in.LastName)
	}

	err = s.withTenantTx(ctx, existing.TenantID, func(tx pgx.Tx) error {
		if in.Password != "" {
			hash, err := auth.HashPassword(in.Password)
			if err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `
				UPDATE users SET email=$2, role=$3, first_name=$4, last_name=$5, password_hash=$6, updated_at=NOW()
				WHERE id=$1
			`, userID, email, role, firstName, lastName, hash)
			return err
		}
		_, err := tx.Exec(ctx, `
			UPDATE users SET email=$2, role=$3, first_name=$4, last_name=$5, updated_at=NOW()
			WHERE id=$1
		`, userID, email, role, firstName, lastName)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}
	_ = s.audit(ctx, adminID, "update", "tenant_user", userID, map[string]interface{}{
		"tenant_id": existing.TenantID,
		"role":      role,
	})
	return s.GetUser(ctx, userID)
}

// DeleteUser removes a workspace member (blocks deleting the last owner).
func (s *Service) DeleteUser(ctx context.Context, adminID, userID string) (bool, error) {
	existing, err := s.GetUser(ctx, userID)
	if err != nil {
		return false, err
	}
	if existing == nil {
		return false, nil
	}
	if existing.Role == "owner" {
		var ownerCount int
		err := s.withTenantTx(ctx, existing.TenantID, func(tx pgx.Tx) error {
			return tx.QueryRow(ctx, `
				SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'owner'
			`, existing.TenantID).Scan(&ownerCount)
		})
		if err != nil {
			return false, err
		}
		if ownerCount <= 1 {
			return false, fmt.Errorf("cannot delete the last owner")
		}
	}

	err = s.withTenantTx(ctx, existing.TenantID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return pgx.ErrNoRows
		}
		return nil
	})
	if err == pgx.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("delete user: %w", err)
	}
	_ = s.audit(ctx, adminID, "delete", "tenant_user", userID, map[string]interface{}{
		"tenant_id": existing.TenantID,
	})
	return true, nil
}

func (s *Service) withTenantTx(ctx context.Context, tenantID string, fn func(pgx.Tx) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT set_config('app.tenant_id', $1, true)`, tenantID); err != nil {
		return fmt.Errorf("set tenant: %w", err)
	}
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Service) tenantExists(ctx context.Context, tenantID string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM tenants WHERE id = $1)`, tenantID).Scan(&exists)
	return exists, err
}

type userScannable interface {
	Scan(dest ...interface{}) error
}

func scanPlatformUser(row userScannable) (*PlatformUser, error) {
	var u PlatformUser
	var createdAt time.Time
	err := row.Scan(&u.ID, &u.TenantID, &u.TenantName, &u.TenantSlug, &u.Email, &u.Role, &u.FirstName, &u.LastName, &createdAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	return &u, nil
}

func scanPlatformUsers(rows pgx.Rows) ([]PlatformUser, error) {
	list := make([]PlatformUser, 0)
	for rows.Next() {
		u, err := scanPlatformUser(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *u)
	}
	return list, rows.Err()
}
