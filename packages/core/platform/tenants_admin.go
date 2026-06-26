package platform

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/onboarding"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
)

// TenantCreateInput provisions a new workspace from the platform console.
type TenantCreateInput struct {
	Name               string `json:"name"`
	Slug               string `json:"slug"`
	IndustryPack       string `json:"industry_pack"`
	PlanID             string `json:"plan_id"`
	SubscriptionStatus string `json:"subscription_status"`
	OwnerEmail         string `json:"owner_email"`
	OwnerPassword      string `json:"owner_password"`
}

// GetTenant returns one tenant registry entry.
func (s *Service) GetTenant(ctx context.Context, tenantID string) (*TenantSummary, error) {
	return s.getTenant(ctx, tenantID)
}

// CreateTenant provisions a tenant with optional initial owner user.
func (s *Service) CreateTenant(ctx context.Context, adminID string, in TenantCreateInput) (*TenantSummary, error) {
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	industryPack := strings.TrimSpace(in.IndustryPack)
	if industryPack == "" {
		industryPack = "field-services"
	}
	planID := strings.TrimSpace(in.PlanID)
	if planID == "" {
		planID = "starter"
	}
	if s.appCfg != nil {
		if _, err := billing.PlanFromConfig(s.appCfg, planID); err != nil {
			exists, err := s.planExists(ctx, planID)
			if err != nil {
				return nil, err
			}
			if !exists {
				return nil, fmt.Errorf("%w: %s", ErrUnknownPlan, planID)
			}
		}
	}
	subStatus := strings.TrimSpace(in.SubscriptionStatus)
	if subStatus == "" {
		subStatus = "trialing"
	}
	if err := validateSubscriptionStatus(subStatus); err != nil {
		return nil, err
	}

	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = slugifyTenant(name)
	}

	flagsJSON := []byte(`{}`)
	if s.appCfg != nil {
		var err error
		flagsJSON, err = json.Marshal(s.appCfg.Features)
		if err != nil {
			return nil, fmt.Errorf("marshal feature flags: %w", err)
		}
	}

	tenantID := uuid.New().String()
	ownerEmail := strings.ToLower(strings.TrimSpace(in.OwnerEmail))
	ownerPassword := in.OwnerPassword
	createOwner := ownerEmail != "" && ownerPassword != ""

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		INSERT INTO tenants (id, slug, name, industry_pack, plan_id, subscription_status, feature_flags, signup_attribution)
		VALUES ($1, $2, $3, $4, $5, $6, $7, '{}')
	`, tenantID, slug, name, industryPack, planID, subStatus, flagsJSON)
	if err != nil {
		return nil, fmt.Errorf("create tenant: %w", err)
	}

	if s.appCfg != nil {
		plugins := s.appCfg.PluginsForSignup(industryPack, planID)
		for _, pid := range plugins {
			_, err = tx.Exec(ctx, `
				INSERT INTO tenant_plugins (tenant_id, plugin_id, enabled) VALUES ($1, $2, true)
			`, tenantID, pid)
			if err != nil {
				return nil, fmt.Errorf("seed tenant plugins: %w", err)
			}
		}
	}

	if createOwner {
		hash, err := auth.HashPassword(ownerPassword)
		if err != nil {
			return nil, err
		}
		userID := uuid.New().String()
		_, err = tx.Exec(ctx, `SELECT set_config('app.tenant_id', $1, true)`, tenantID)
		if err != nil {
			return nil, err
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO users (id, tenant_id, email, password_hash, role, first_name)
			VALUES ($1, $2, $3, $4, 'owner', $5)
		`, userID, tenantID, ownerEmail, hash, name)
		if err != nil {
			return nil, fmt.Errorf("create owner user: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if err := onboarding.CreateInitialState(tenant.WithID(ctx, tenantID), s.pool, tenantID, industryPack); err != nil {
		return nil, fmt.Errorf("init onboarding: %w", err)
	}

	_ = s.audit(ctx, adminID, "create", "tenant", tenantID, map[string]interface{}{
		"name":          name,
		"industry_pack": industryPack,
		"plan_id":       planID,
	})
	return s.getTenant(ctx, tenantID)
}

func slugifyTenant(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
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
