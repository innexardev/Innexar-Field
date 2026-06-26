package platform

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	validLandingSections = map[string]bool{
		"hero": true, "features": true, "pricing": true, "footer": true, "promo": true,
	}
	ErrUnknownPlan = errors.New("unknown plan")
)

// Service implements platform administration operations.
type Service struct {
	pool   *pgxpool.Pool
	auth   *auth.Service
	appCfg *config.AppConfig
}

func NewService(pool *pgxpool.Pool, authSvc *auth.Service, appCfg *config.AppConfig) *Service {
	return &Service{pool: pool, auth: authSvc, appCfg: appCfg}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	Admin Admin  `json:"admin"`
}

type Admin struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || req.Password == "" {
		return nil, auth.ErrInvalidCredentials
	}
	var id, hash, role string
	err := s.pool.QueryRow(ctx, `
		SELECT id, password_hash, role FROM find_platform_admin_by_email($1)
	`, email).Scan(&id, &hash, &role)
	if err != nil {
		return nil, auth.ErrInvalidCredentials
	}
	if role != "super_admin" {
		return nil, auth.ErrInvalidCredentials
	}
	if err := auth.CheckPassword(hash, req.Password); err != nil {
		return nil, auth.ErrInvalidCredentials
	}
	_, _ = s.pool.Exec(ctx, `UPDATE platform_admins SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, id)
	token, err := s.auth.IssuePlatformToken(id, email)
	if err != nil {
		return nil, err
	}
	_ = s.audit(ctx, id, "login", "platform_admin", id, nil)
	return &LoginResponse{
		Token: token,
		Admin: Admin{ID: id, Email: email, Role: role},
	}, nil
}

func (s *Service) Me(ctx context.Context, adminID string) (*Admin, error) {
	var admin Admin
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, role FROM platform_admins
		WHERE id = $1 AND disabled = false
	`, adminID).Scan(&admin.ID, &admin.Email, &admin.Role)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get platform admin: %w", err)
	}
	return &admin, nil
}

type Plan struct {
	ID               string          `json:"id"`
	Name             string          `json:"name"`
	Description      string          `json:"description"`
	PriceMonthlyCents *int64         `json:"price_monthly_cents,omitempty"`
	StripePriceID    string          `json:"stripe_price_id,omitempty"`
	Features         json.RawMessage `json:"features"`
	Active           bool            `json:"active"`
	SortOrder        int             `json:"sort_order"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

func (s *Service) ListPlans(ctx context.Context) ([]Plan, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, price_monthly_cents, COALESCE(stripe_price_id,''),
			features, active, sort_order, created_at, updated_at
		FROM platform_plans ORDER BY sort_order, id
	`)
	if err != nil {
		return nil, fmt.Errorf("list plans: %w", err)
	}
	defer rows.Close()
	return scanPlans(rows)
}

func (s *Service) GetPlan(ctx context.Context, id string) (*Plan, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, name, description, price_monthly_cents, COALESCE(stripe_price_id,''),
			features, active, sort_order, created_at, updated_at
		FROM platform_plans WHERE id = $1
	`, id)
	p, err := scanPlan(row)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

type PlanInput struct {
	ID                string          `json:"id"`
	Name              string          `json:"name"`
	Description       string          `json:"description"`
	PriceMonthlyCents *int64          `json:"price_monthly_cents"`
	StripePriceID     string          `json:"stripe_price_id"`
	Features          json.RawMessage `json:"features"`
	Active            *bool           `json:"active"`
	SortOrder         *int            `json:"sort_order"`
}

func (s *Service) CreatePlan(ctx context.Context, adminID string, in PlanInput) (*Plan, error) {
	if in.ID == "" || in.Name == "" {
		return nil, fmt.Errorf("id and name are required")
	}
	features := in.Features
	if len(features) == 0 {
		features = json.RawMessage(`[]`)
	}
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	sortOrder := 0
	if in.SortOrder != nil {
		sortOrder = *in.SortOrder
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO platform_plans (id, name, description, price_monthly_cents, stripe_price_id, features, active, sort_order)
		VALUES ($1, $2, $3, $4, NULLIF($5,''), $6, $7, $8)
	`, in.ID, in.Name, in.Description, in.PriceMonthlyCents, in.StripePriceID, features, active, sortOrder)
	if err != nil {
		return nil, fmt.Errorf("create plan: %w", err)
	}
	_ = s.audit(ctx, adminID, "create", "platform_plan", in.ID, nil)
	return s.GetPlan(ctx, in.ID)
}

func (s *Service) UpdatePlan(ctx context.Context, adminID, id string, in PlanInput) (*Plan, error) {
	existing, err := s.GetPlan(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}
	name := existing.Name
	if in.Name != "" {
		name = in.Name
	}
	desc := existing.Description
	if in.Description != "" {
		desc = in.Description
	}
	price := existing.PriceMonthlyCents
	if in.PriceMonthlyCents != nil {
		price = in.PriceMonthlyCents
	}
	stripe := existing.StripePriceID
	if in.StripePriceID != "" {
		stripe = in.StripePriceID
	}
	features := existing.Features
	if len(in.Features) > 0 {
		features = in.Features
	}
	active := existing.Active
	if in.Active != nil {
		active = *in.Active
	}
	sortOrder := existing.SortOrder
	if in.SortOrder != nil {
		sortOrder = *in.SortOrder
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE platform_plans SET name=$2, description=$3, price_monthly_cents=$4,
			stripe_price_id=NULLIF($5,''), features=$6, active=$7, sort_order=$8, updated_at=NOW()
		WHERE id=$1
	`, id, name, desc, price, stripe, features, active, sortOrder)
	if err != nil {
		return nil, fmt.Errorf("update plan: %w", err)
	}
	_ = s.audit(ctx, adminID, "update", "platform_plan", id, nil)
	return s.GetPlan(ctx, id)
}

func (s *Service) DeletePlan(ctx context.Context, adminID, id string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `DELETE FROM platform_plans WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete plan: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return false, nil
	}
	_ = s.audit(ctx, adminID, "delete", "platform_plan", id, nil)
	return true, nil
}

type Promotion struct {
	ID               string     `json:"id"`
	Code             string     `json:"code"`
	Description      string     `json:"description"`
	DiscountPercent  *int       `json:"discount_percent,omitempty"`
	DiscountCents    *int64     `json:"discount_cents,omitempty"`
	PlanID           string     `json:"plan_id,omitempty"`
	StartsAt         *time.Time `json:"starts_at,omitempty"`
	EndsAt           *time.Time `json:"ends_at,omitempty"`
	MaxRedemptions   *int       `json:"max_redemptions,omitempty"`
	RedemptionCount  int        `json:"redemption_count"`
	Active           bool       `json:"active"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (s *Service) ListPromotions(ctx context.Context) ([]Promotion, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, code, description, discount_percent, discount_cents,
			COALESCE(plan_id::text,''), starts_at, ends_at, max_redemptions,
			redemption_count, active, created_at, updated_at
		FROM platform_promotions ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list promotions: %w", err)
	}
	defer rows.Close()
	var list []Promotion
	for rows.Next() {
		p, err := scanPromotion(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *p)
	}
	return list, rows.Err()
}

func (s *Service) GetPromotion(ctx context.Context, id string) (*Promotion, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, code, description, discount_percent, discount_cents,
			COALESCE(plan_id::text,''), starts_at, ends_at, max_redemptions,
			redemption_count, active, created_at, updated_at
		FROM platform_promotions WHERE id = $1
	`, id)
	p, err := scanPromotion(row)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

type PromotionInput struct {
	Code            string     `json:"code"`
	Description     string     `json:"description"`
	DiscountPercent *int       `json:"discount_percent"`
	DiscountCents   *int64     `json:"discount_cents"`
	PlanID          string     `json:"plan_id"`
	StartsAt        *time.Time `json:"starts_at"`
	EndsAt          *time.Time `json:"ends_at"`
	MaxRedemptions  *int       `json:"max_redemptions"`
	Active          *bool      `json:"active"`
}

func (s *Service) CreatePromotion(ctx context.Context, adminID string, in PromotionInput) (*Promotion, error) {
	code := strings.ToUpper(strings.TrimSpace(in.Code))
	if code == "" {
		return nil, fmt.Errorf("code is required")
	}
	if err := validatePromotionFields(promotionFields{
		DiscountPercent: in.DiscountPercent,
		DiscountCents:   in.DiscountCents,
		PlanID:          in.PlanID,
		StartsAt:        in.StartsAt,
		EndsAt:          in.EndsAt,
		MaxRedemptions:  in.MaxRedemptions,
	}); err != nil {
		return nil, err
	}
	if in.PlanID != "" {
		exists, err := s.planExists(ctx, in.PlanID)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("%w: %s", ErrUnknownPlan, in.PlanID)
		}
	}
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	id := uuid.New().String()
	_, err := s.pool.Exec(ctx, `
		INSERT INTO platform_promotions (id, code, description, discount_percent, discount_cents,
			plan_id, starts_at, ends_at, max_redemptions, active)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6,''), $7, $8, $9, $10)
	`, id, code, in.Description, in.DiscountPercent, in.DiscountCents,
		in.PlanID, in.StartsAt, in.EndsAt, in.MaxRedemptions, active)
	if err != nil {
		return nil, fmt.Errorf("create promotion: %w", err)
	}
	_ = s.audit(ctx, adminID, "create", "platform_promotion", id, nil)
	return s.GetPromotion(ctx, id)
}

func (s *Service) UpdatePromotion(ctx context.Context, adminID, id string, in PromotionInput) (*Promotion, error) {
	existing, err := s.GetPromotion(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}
	code := existing.Code
	if in.Code != "" {
		code = strings.ToUpper(strings.TrimSpace(in.Code))
	}
	desc := existing.Description
	if in.Description != "" {
		desc = in.Description
	}
	discPct := existing.DiscountPercent
	if in.DiscountPercent != nil {
		discPct = in.DiscountPercent
	}
	discCents := existing.DiscountCents
	if in.DiscountCents != nil {
		discCents = in.DiscountCents
	}
	planID := existing.PlanID
	if in.PlanID != "" {
		planID = in.PlanID
	}
	starts := existing.StartsAt
	if in.StartsAt != nil {
		starts = in.StartsAt
	}
	ends := existing.EndsAt
	if in.EndsAt != nil {
		ends = in.EndsAt
	}
	maxRed := existing.MaxRedemptions
	if in.MaxRedemptions != nil {
		maxRed = in.MaxRedemptions
	}
	active := existing.Active
	if in.Active != nil {
		active = *in.Active
	}
	if err := validatePromotionFields(promotionFields{
		DiscountPercent: discPct,
		DiscountCents:   discCents,
		PlanID:          planID,
		StartsAt:        starts,
		EndsAt:          ends,
		MaxRedemptions:  maxRed,
	}); err != nil {
		return nil, err
	}
	if planID != "" {
		exists, err := s.planExists(ctx, planID)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("%w: %s", ErrUnknownPlan, planID)
		}
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE platform_promotions SET code=$2, description=$3, discount_percent=$4, discount_cents=$5,
			plan_id=NULLIF($6,''), starts_at=$7, ends_at=$8, max_redemptions=$9, active=$10, updated_at=NOW()
		WHERE id=$1
	`, id, code, desc, discPct, discCents, planID, starts, ends, maxRed, active)
	if err != nil {
		return nil, fmt.Errorf("update promotion: %w", err)
	}
	_ = s.audit(ctx, adminID, "update", "platform_promotion", id, nil)
	return s.GetPromotion(ctx, id)
}

func (s *Service) DeletePromotion(ctx context.Context, adminID, id string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `DELETE FROM platform_promotions WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete promotion: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return false, nil
	}
	_ = s.audit(ctx, adminID, "delete", "platform_promotion", id, nil)
	return true, nil
}

type LandingBlock struct {
	ID        string          `json:"id"`
	Section   string          `json:"section"`
	BlockKey  string          `json:"block_key"`
	Content   json.RawMessage `json:"content"`
	Active    bool            `json:"active"`
	SortOrder int             `json:"sort_order"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

func (s *Service) ListLandingContent(ctx context.Context, section string) ([]LandingBlock, error) {
	if section != "" && !validLandingSections[section] {
		return nil, fmt.Errorf("invalid section %q", section)
	}
	q := `
		SELECT id, section, block_key, content, active, sort_order, created_at, updated_at
		FROM landing_content_blocks`
	args := []any{}
	if section != "" {
		q += ` WHERE section = $1`
		args = append(args, section)
	}
	q += ` ORDER BY section, sort_order, block_key`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list landing content: %w", err)
	}
	defer rows.Close()
	var list []LandingBlock
	for rows.Next() {
		var b LandingBlock
		if err := rows.Scan(&b.ID, &b.Section, &b.BlockKey, &b.Content, &b.Active, &b.SortOrder, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, b)
	}
	return list, rows.Err()
}

type LandingInput struct {
	Section   string          `json:"section"`
	BlockKey  string          `json:"block_key"`
	Content   json.RawMessage `json:"content"`
	Active    *bool           `json:"active"`
	SortOrder *int            `json:"sort_order"`
}


func (s *Service) ListPublicLandingContent(ctx context.Context) ([]LandingBlock, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, section, block_key, content, active, sort_order, created_at, updated_at
		FROM landing_content_blocks
		WHERE active = true
		ORDER BY section, sort_order, block_key`)
	if err != nil {
		return nil, fmt.Errorf("list public landing content: %w", err)
	}
	defer rows.Close()
	var list []LandingBlock
	for rows.Next() {
		var b LandingBlock
		if err := rows.Scan(&b.ID, &b.Section, &b.BlockKey, &b.Content, &b.Active, &b.SortOrder, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, b)
	}
	return list, rows.Err()
}

func (s *Service) CreateLandingContent(ctx context.Context, adminID string, in LandingInput) (*LandingBlock, error) {
	if !validLandingSections[in.Section] {
		return nil, fmt.Errorf("invalid section %q", in.Section)
	}
	blockKey := in.BlockKey
	if blockKey == "" {
		blockKey = "default"
	}
	content := in.Content
	if len(content) == 0 {
		content = json.RawMessage(`{}`)
	}
	if err := validateLandingContentHrefs(content); err != nil {
		return nil, err
	}
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	sortOrder := 0
	if in.SortOrder != nil {
		sortOrder = *in.SortOrder
	}
	id := uuid.New().String()
	_, err := s.pool.Exec(ctx, `
		INSERT INTO landing_content_blocks (id, section, block_key, content, active, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, in.Section, blockKey, content, active, sortOrder)
	if err != nil {
		return nil, fmt.Errorf("create landing content: %w", err)
	}
	_ = s.audit(ctx, adminID, "create", "landing_content", id, map[string]interface{}{"section": in.Section})
	return s.getLandingBlock(ctx, id)
}

func (s *Service) UpdateLandingContent(ctx context.Context, adminID, id string, in LandingInput) (*LandingBlock, error) {
	existing, err := s.getLandingBlock(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}
	section := existing.Section
	if in.Section != "" {
		if !validLandingSections[in.Section] {
			return nil, fmt.Errorf("invalid section %q", in.Section)
		}
		section = in.Section
	}
	blockKey := existing.BlockKey
	if in.BlockKey != "" {
		blockKey = in.BlockKey
	}
	content := existing.Content
	if len(in.Content) > 0 {
		content = in.Content
	}
	if err := validateLandingContentHrefs(content); err != nil {
		return nil, err
	}
	active := existing.Active
	if in.Active != nil {
		active = *in.Active
	}
	sortOrder := existing.SortOrder
	if in.SortOrder != nil {
		sortOrder = *in.SortOrder
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE landing_content_blocks SET section=$2, block_key=$3, content=$4, active=$5, sort_order=$6, updated_at=NOW()
		WHERE id=$1
	`, id, section, blockKey, content, active, sortOrder)
	if err != nil {
		return nil, fmt.Errorf("update landing content: %w", err)
	}
	_ = s.audit(ctx, adminID, "update", "landing_content", id, nil)
	return s.getLandingBlock(ctx, id)
}

func (s *Service) DeleteLandingContent(ctx context.Context, adminID, id string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `DELETE FROM landing_content_blocks WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete landing content: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return false, nil
	}
	_ = s.audit(ctx, adminID, "delete", "landing_content", id, nil)
	return true, nil
}

func (s *Service) getLandingBlock(ctx context.Context, id string) (*LandingBlock, error) {
	var b LandingBlock
	err := s.pool.QueryRow(ctx, `
		SELECT id, section, block_key, content, active, sort_order, created_at, updated_at
		FROM landing_content_blocks WHERE id = $1
	`, id).Scan(&b.ID, &b.Section, &b.BlockKey, &b.Content, &b.Active, &b.SortOrder, &b.CreatedAt, &b.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &b, err
}

type PlatformConfig struct {
	BrandOverrides map[string]interface{} `json:"brand_overrides"`
	FeatureFlags   map[string]bool        `json:"feature_flags"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

func (s *Service) GetConfig(ctx context.Context) (*PlatformConfig, error) {
	var brandRaw, flagsRaw []byte
	var updatedAt time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT brand_overrides, feature_flags, updated_at FROM platform_config WHERE id = 1
	`).Scan(&brandRaw, &flagsRaw, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("get platform config: %w", err)
	}
	cfg := &PlatformConfig{
		BrandOverrides: map[string]interface{}{},
		FeatureFlags:   map[string]bool{},
		UpdatedAt:      updatedAt,
	}
	_ = json.Unmarshal(brandRaw, &cfg.BrandOverrides)
	_ = json.Unmarshal(flagsRaw, &cfg.FeatureFlags)
	if cfg.BrandOverrides == nil {
		cfg.BrandOverrides = map[string]interface{}{}
	}
	if cfg.FeatureFlags == nil {
		cfg.FeatureFlags = map[string]bool{}
	}
	return cfg, nil
}

type ConfigInput struct {
	BrandOverrides map[string]interface{} `json:"brand_overrides"`
	FeatureFlags   map[string]bool        `json:"feature_flags"`
}

func (s *Service) UpdateConfig(ctx context.Context, adminID string, in ConfigInput) (*PlatformConfig, error) {
	existing, err := s.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	brand := existing.BrandOverrides
	if in.BrandOverrides != nil {
		brand = in.BrandOverrides
	}
	flags := existing.FeatureFlags
	if in.FeatureFlags != nil {
		flags = in.FeatureFlags
	}
	brandJSON, err := json.Marshal(brand)
	if err != nil {
		return nil, err
	}
	flagsJSON, err := json.Marshal(flags)
	if err != nil {
		return nil, err
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE platform_config SET brand_overrides=$1, feature_flags=$2, updated_at=NOW() WHERE id=1
	`, brandJSON, flagsJSON)
	if err != nil {
		return nil, fmt.Errorf("update platform config: %w", err)
	}
	_ = s.audit(ctx, adminID, "update", "platform_config", "1", nil)
	return s.GetConfig(ctx)
}

type TenantSummary struct {
	ID                 string     `json:"id"`
	Slug               string     `json:"slug"`
	Name               string     `json:"name"`
	IndustryPack       string     `json:"industry_pack"`
	PlanID             string     `json:"plan_id"`
	SubscriptionStatus string     `json:"subscription_status"`
	SuspendedAt        *time.Time `json:"suspended_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
}

func (s *Service) ListTenants(ctx context.Context) ([]TenantSummary, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, slug, name, industry_pack, plan_id, subscription_status, suspended_at, created_at
		FROM tenants ORDER BY created_at DESC LIMIT 500
	`)
	if err != nil {
		return nil, fmt.Errorf("list tenants: %w", err)
	}
	defer rows.Close()
	var list []TenantSummary
	for rows.Next() {
		var t TenantSummary
		if err := rows.Scan(&t.ID, &t.Slug, &t.Name, &t.IndustryPack, &t.PlanID, &t.SubscriptionStatus, &t.SuspendedAt, &t.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

type TenantPatch struct {
	Suspended *bool  `json:"suspended"`
	PlanID    string `json:"plan_id"`
}

func (s *Service) planExists(ctx context.Context, planID string) (bool, error) {
	if s.appCfg != nil {
		if _, err := billing.PlanFromConfig(s.appCfg, planID); err == nil {
			return true, nil
		}
	}
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM platform_plans WHERE id = $1)`, planID).Scan(&exists)
	return exists, err
}

func (s *Service) UpdateTenant(ctx context.Context, adminID, tenantID string, in TenantPatch) (*TenantSummary, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM tenants WHERE id = $1)`, tenantID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, nil
	}
	if in.Suspended != nil {
		if *in.Suspended {
			_, err = s.pool.Exec(ctx, `UPDATE tenants SET suspended_at = NOW(), updated_at = NOW() WHERE id = $1`, tenantID)
		} else {
			_, err = s.pool.Exec(ctx, `UPDATE tenants SET suspended_at = NULL, updated_at = NOW() WHERE id = $1`, tenantID)
		}
		if err != nil {
			return nil, fmt.Errorf("update tenant suspend: %w", err)
		}
	}
	if in.PlanID != "" {
		exists, err := s.planExists(ctx, in.PlanID)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("%w: %s", ErrUnknownPlan, in.PlanID)
		}
		_, err = s.pool.Exec(ctx, `UPDATE tenants SET plan_id = $2, updated_at = NOW() WHERE id = $1`, tenantID, in.PlanID)
		if err != nil {
			return nil, fmt.Errorf("update tenant plan: %w", err)
		}
	}
	_ = s.audit(ctx, adminID, "update", "tenant", tenantID, map[string]interface{}{
		"suspended": in.Suspended,
		"plan_id":   in.PlanID,
	})
	return s.getTenant(ctx, tenantID)
}

func (s *Service) getTenant(ctx context.Context, id string) (*TenantSummary, error) {
	var t TenantSummary
	err := s.pool.QueryRow(ctx, `
		SELECT id, slug, name, industry_pack, plan_id, subscription_status, suspended_at, created_at
		FROM tenants WHERE id = $1
	`, id).Scan(&t.ID, &t.Slug, &t.Name, &t.IndustryPack, &t.PlanID, &t.SubscriptionStatus, &t.SuspendedAt, &t.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &t, err
}

type Stats struct {
	TotalTenants      int            `json:"total_tenants"`
	ActiveTenants     int            `json:"active_tenants"`
	SuspendedTenants  int            `json:"suspended_tenants"`
	SignupsLast30Days int            `json:"signups_last_30_days"`
	TenantsByPlan     map[string]int `json:"tenants_by_plan"`
	TotalPlans        int            `json:"total_plans"`
	ActivePromotions  int            `json:"active_promotions"`
}

func (s *Service) Stats(ctx context.Context) (*Stats, error) {
	st := &Stats{TenantsByPlan: map[string]int{}}
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenants`).Scan(&st.TotalTenants)
	if err != nil {
		return nil, err
	}
	err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenants WHERE suspended_at IS NULL`).Scan(&st.ActiveTenants)
	if err != nil {
		return nil, err
	}
	err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenants WHERE suspended_at IS NOT NULL`).Scan(&st.SuspendedTenants)
	if err != nil {
		return nil, err
	}
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM tenants WHERE created_at >= NOW() - INTERVAL '30 days'
	`).Scan(&st.SignupsLast30Days)
	if err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `SELECT plan_id, COUNT(*) FROM tenants GROUP BY plan_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var plan string
		var count int
		if err := rows.Scan(&plan, &count); err != nil {
			return nil, err
		}
		st.TenantsByPlan[plan] = count
	}
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM platform_plans`).Scan(&st.TotalPlans)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM platform_promotions WHERE active = true`).Scan(&st.ActivePromotions)
	return st, rows.Err()
}

type AuditEntry struct {
	ID           string          `json:"id"`
	AdminID      *string         `json:"admin_id,omitempty"`
	Action       string          `json:"action"`
	ResourceType string          `json:"resource_type"`
	ResourceID   *string         `json:"resource_id,omitempty"`
	Details      json.RawMessage `json:"details"`
	CreatedAt    time.Time       `json:"created_at"`
}

func (s *Service) ListAuditLog(ctx context.Context, limit, offset int) ([]AuditEntry, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, admin_id::text, action, resource_type, resource_id, details, created_at
		FROM platform_audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list audit log: %w", err)
	}
	defer rows.Close()
	var list []AuditEntry
	for rows.Next() {
		var e AuditEntry
		var adminID, resourceID *string
		if err := rows.Scan(&e.ID, &adminID, &e.Action, &e.ResourceType, &resourceID, &e.Details, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.AdminID = adminID
		e.ResourceID = resourceID
		if len(e.Details) == 0 {
			e.Details = json.RawMessage(`{}`)
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func (s *Service) audit(ctx context.Context, adminID, action, resourceType, resourceID string, details map[string]interface{}) error {
	var detailsJSON []byte
	if details != nil {
		var err error
		detailsJSON, err = json.Marshal(details)
		if err != nil {
			return err
		}
	} else {
		detailsJSON = []byte(`{}`)
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO platform_audit_log (id, admin_id, action, resource_type, resource_id, details)
		VALUES ($1, $2, $3, $4, NULLIF($5,''), $6)
	`, uuid.New().String(), adminID, action, resourceType, resourceID, detailsJSON)
	return err
}

type scannable interface {
	Scan(dest ...interface{}) error
}

func scanPlan(row scannable) (*Plan, error) {
	var p Plan
	var price *int64
	err := row.Scan(&p.ID, &p.Name, &p.Description, &price, &p.StripePriceID,
		&p.Features, &p.Active, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	p.PriceMonthlyCents = price
	return &p, nil
}

func scanPlans(rows pgx.Rows) ([]Plan, error) {
	var list []Plan
	for rows.Next() {
		p, err := scanPlan(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *p)
	}
	return list, rows.Err()
}

func scanPromotion(row scannable) (*Promotion, error) {
	var p Promotion
	var planID string
	err := row.Scan(&p.ID, &p.Code, &p.Description, &p.DiscountPercent, &p.DiscountCents,
		&planID, &p.StartsAt, &p.EndsAt, &p.MaxRedemptions, &p.RedemptionCount, &p.Active, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	p.PlanID = planID
	return &p, nil
}

// ValidLandingSection reports whether a landing page section name is allowed.
func ValidLandingSection(section string) bool {
	return validLandingSections[section]
}
