package identity

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/onboarding"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Service handles signup, login, and tenant provisioning.
type Service struct {
	pool     *pgxpool.Pool
	auth     *auth.Service
	appCfg   *config.AppConfig
	seedDemo bool
}

func NewService(pool *pgxpool.Pool, authSvc *auth.Service, appCfg *config.AppConfig, seedDemo bool) *Service {
	return &Service{pool: pool, auth: authSvc, appCfg: appCfg, seedDemo: seedDemo}
}

type SignupRequest struct {
	CompanyName  string          `json:"company_name"`
	Email        string          `json:"email"`
	Password     string          `json:"password"`
	IndustryPack string          `json:"industry_pack"`
	PlanID       string          `json:"plan_id"`
	Metadata     *SignupMetadata `json:"metadata,omitempty"`
}

type SignupResponse struct {
	Token      string                      `json:"token"`
	TenantID   string                      `json:"tenant_id"`
	UserID     string                      `json:"user_id"`
	Onboarding *onboarding.StatusResponse  `json:"onboarding,omitempty"`
}

func (s *Service) Signup(ctx context.Context, req SignupRequest) (*SignupResponse, error) {
	if req.Email == "" || req.Password == "" || req.CompanyName == "" {
		return nil, fmt.Errorf("missing required fields")
	}
	if req.IndustryPack == "" {
		req.IndustryPack = "field-services"
	}
	if req.PlanID == "" {
		req.PlanID = "starter"
	}
	if _, err := billing.PlanFromConfig(s.appCfg, req.PlanID); err != nil {
		req.PlanID = "starter"
	}

	slug := slugify(req.CompanyName)
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	tenantID := uuid.New().String()
	userID := uuid.New().String()

	flagsJSON, err := json.Marshal(s.appCfg.Features)
	if err != nil {
		return nil, fmt.Errorf("marshal feature flags: %w", err)
	}
	attributionJSON, err := NormalizeSignupAttribution(req.Metadata)
	if err != nil {
		return nil, fmt.Errorf("normalize signup attribution: %w", err)
	}
	if attributionJSON == nil {
		attributionJSON = json.RawMessage(`{}`)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		INSERT INTO tenants (id, slug, name, industry_pack, plan_id, subscription_status, feature_flags, signup_attribution)
		VALUES ($1, $2, $3, $4, $5, 'trialing', $6, $7)
	`, tenantID, slug, req.CompanyName, req.IndustryPack, req.PlanID, flagsJSON, attributionJSON)
	if err != nil {
		return nil, mapSignupErr(fmt.Errorf("create tenant: %w", err))
	}

	_, err = tx.Exec(ctx, "SELECT set_config('app.tenant_id', $1, true)", tenantID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO users (id, tenant_id, email, password_hash, role, first_name)
		VALUES ($1, $2, $3, $4, 'owner', $5)
	`, userID, tenantID, strings.ToLower(req.Email), hash, req.CompanyName)
	if err != nil {
		return nil, mapSignupErr(fmt.Errorf("create user: %w", err))
	}

	plugins := s.appCfg.PluginsForSignup(req.IndustryPack, req.PlanID)
	for _, pid := range plugins {
		_, err = tx.Exec(ctx, `
			INSERT INTO tenant_plugins (tenant_id, plugin_id, enabled) VALUES ($1, $2, true)
		`, tenantID, pid)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if err := onboarding.CreateInitialState(tenant.WithID(ctx, tenantID), s.pool, tenantID, req.IndustryPack); err != nil {
		return nil, fmt.Errorf("init onboarding: %w", err)
	}

	if s.seedDemo {
		_ = s.seedDemoData(ctx, tenantID)
	}

	token, err := s.auth.IssueToken(userID, tenantID, req.Email, "owner")
	if err != nil {
		return nil, err
	}

	obStatus := &onboarding.StatusResponse{
		Step:           onboarding.StepIndustry,
		CompletedSteps: []string{onboarding.StepSignup},
		IndustryPacks:  []string{req.IndustryPack},
		Completed:      false,
	}

	return &SignupResponse{
		Token:      token,
		TenantID:   tenantID,
		UserID:     userID,
		Onboarding: obStatus,
	}, nil
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	TenantID string `json:"tenant_id"`
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	store := &userStore{pool: s.pool}
	token, claims, err := s.auth.Login(ctx, store, strings.ToLower(req.Email), req.Password)
	if err != nil {
		return nil, err
	}
	suspended, err := tenant.IsSuspended(ctx, s.pool, claims.TenantID)
	if err != nil {
		return nil, fmt.Errorf("tenant status: %w", err)
	}
	if suspended {
		return nil, tenant.ErrSuspended
	}
	return &LoginResponse{
		Token: token,
		User: UserResponse{
			ID:       claims.UserID,
			Email:    claims.Email,
			Role:     claims.Role,
			TenantID: claims.TenantID,
		},
	}, nil
}

func (s *Service) Me(ctx context.Context, userID string) (*UserResponse, error) {
	var u UserResponse
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, role, tenant_id FROM users WHERE id = $1
	`, userID).Scan(&u.ID, &u.Email, &u.Role, &u.TenantID)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// TenantUser is a workspace member returned by GET /users (no credentials).
type TenantUser struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	CreatedAt string `json:"created_at"`
}

// ListUsers returns tenant-scoped workspace members (explicit tenant_id + RLS).
func (s *Service) ListUsers(ctx context.Context) ([]TenantUser, error) {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return nil, fmt.Errorf("tenant context required")
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, email, role, first_name, last_name, created_at
		FROM users
		WHERE tenant_id = $1
		ORDER BY created_at ASC, email ASC
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	list := make([]TenantUser, 0)
	for rows.Next() {
		var u TenantUser
		var createdAt time.Time
		if err := rows.Scan(&u.ID, &u.Email, &u.Role, &u.FirstName, &u.LastName, &createdAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		u.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		list = append(list, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}
	return list, nil
}

type userStore struct{ pool *pgxpool.Pool }

func (u *userStore) FindByEmail(ctx context.Context, email string) (id, tenantID, passwordHash, role string, err error) {
	err = u.pool.QueryRow(ctx, `
		SELECT id, tenant_id, password_hash, role FROM find_user_by_email($1)
	`, email).Scan(&id, &tenantID, &passwordHash, &role)
	return
}

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, " ", "-")
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			b.WriteRune(r)
		}
	}
	out := b.String()
	if out == "" {
		out = "workspace"
	}
	return out + "-" + uuid.New().String()[:8]
}

func (s *Service) seedDemoData(ctx context.Context, tenantID string) error {
	_, err := s.pool.Exec(ctx, "SELECT set_config('app.tenant_id', $1, true)", tenantID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO customers (id, tenant_id, name, email, phone)
		VALUES (gen_random_uuid(), $1, 'Demo Customer', 'demo@customer.com', '+15551234567')
		ON CONFLICT DO NOTHING
	`, tenantID)
	return err
}
