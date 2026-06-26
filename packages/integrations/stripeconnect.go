package integrations

import (
	"context"
	"fmt"
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/google/uuid"
)

// StripeConnectOnboardResult is returned when starting Connect onboarding.
type StripeConnectOnboardResult struct {
	OnboardingURL string `json:"onboarding_url"`
	AccountID     string `json:"account_id"`
	Mock          bool   `json:"mock,omitempty"`
}

// StripeConnectStatus summarizes Connect account readiness.
type StripeConnectStatus struct {
	IntegrationID  string `json:"integration_id"`
	Status         string `json:"status"`
	AccountID      string `json:"account_id,omitempty"`
	ChargesEnabled bool   `json:"charges_enabled"`
	PayoutsEnabled bool   `json:"payouts_enabled"`
	Mock           bool   `json:"mock,omitempty"`
}

type stripeConnectService struct {
	cfg      *config.AppConfig
	svc      *Service
	resolver billing.SecretResolver
}

func newStripeConnect(cfg *config.AppConfig, base *Service, resolver billing.SecretResolver) *stripeConnectService {
	return &stripeConnectService{cfg: cfg, svc: base, resolver: resolver}
}

func (s *stripeConnectService) StartOnboarding(ctx context.Context, returnPath string) (*StripeConnectOnboardResult, error) {
	def, ok := s.cfg.IntegrationByID(IDStripeConnect)
	if !ok || !def.Enabled {
		return nil, fmt.Errorf("stripe connect integration is disabled")
	}

	accountID := "acct_mock_" + uuid.NewString()[:8]
	mock := billing.UseMockStripe(ctx, s.cfg, s.resolver)

	if !mock && billing.StripeSecretKey(ctx, s.resolver) == "" {
		return nil, fmt.Errorf("STRIPE_SECRET_KEY is not set")
	}

	_, _ = s.svc.Upsert(ctx, IDStripeConnect, "pending", accountID, map[string]interface{}{
		"mock": mock,
	})

	baseURL := webAppURL(s.cfg)
	if returnPath == "" {
		returnPath = def.ReturnPath
	}
	if returnPath == "" {
		returnPath = "/settings/integrations"
	}
	if !strings.HasPrefix(returnPath, "http") {
		returnPath = baseURL + returnPath
	}

	onboardingURL := returnPath
	if mock {
		sep := "?"
		if strings.Contains(returnPath, "?") {
			sep = "&"
		}
		onboardingURL = returnPath + sep + "stripe_connect=mock&account_id=" + accountID
	}

	return &StripeConnectOnboardResult{
		OnboardingURL: onboardingURL,
		AccountID:     accountID,
		Mock:          mock,
	}, nil
}

func (s *stripeConnectService) CompleteOnboarding(ctx context.Context, accountID string) (StripeConnectStatus, error) {
	if accountID == "" {
		return StripeConnectStatus{}, fmt.Errorf("account_id is required")
	}

	pending, err := s.svc.GetStatus(ctx, IDStripeConnect)
	if err != nil {
		return StripeConnectStatus{}, err
	}
	if pending.Status != "pending" || pending.ExternalID == "" || pending.ExternalID != accountID {
		return StripeConnectStatus{}, fmt.Errorf("invalid account_id")
	}

	mock := billing.UseMockStripe(ctx, s.cfg, s.resolver)
	if v, ok := pending.Metadata["mock"].(bool); ok && mock {
		mock = v
	}

	st, err := s.svc.Upsert(ctx, IDStripeConnect, "connected", accountID, map[string]interface{}{
		"charges_enabled": true,
		"payouts_enabled": true,
		"mock":            mock,
	})
	if err != nil {
		return StripeConnectStatus{}, err
	}
	return stripeConnectFromConnection(ctx, st, s.cfg, s.resolver), nil
}

func (s *stripeConnectService) GetStatus(ctx context.Context) (StripeConnectStatus, error) {
	st, err := s.svc.GetStatus(ctx, IDStripeConnect)
	if err != nil {
		return StripeConnectStatus{}, err
	}
	return stripeConnectFromConnection(ctx, st, s.cfg, s.resolver), nil
}

func stripeConnectFromConnection(ctx context.Context, st ConnectionStatus, cfg *config.AppConfig, resolver billing.SecretResolver) StripeConnectStatus {
	charges := st.Status == "connected"
	payouts := st.Status == "connected"
	if v, ok := st.Metadata["charges_enabled"].(bool); ok {
		charges = v
	}
	if v, ok := st.Metadata["payouts_enabled"].(bool); ok {
		payouts = v
	}
	mock := billing.UseMockStripe(ctx, cfg, resolver)
	if m, ok := st.Metadata["mock"].(bool); ok && mock {
		mock = m
	}
	return StripeConnectStatus{
		IntegrationID:  st.IntegrationID,
		Status:         st.Status,
		AccountID:      st.ExternalID,
		ChargesEnabled: charges,
		PayoutsEnabled: payouts,
		Mock:           mock,
	}
}
