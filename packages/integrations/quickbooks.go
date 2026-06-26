package integrations

import (
	"context"
	"fmt"
	"net/url"
	"os"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/google/uuid"
)

// QuickBooksOAuthStart is returned by the OAuth start endpoint.
type QuickBooksOAuthStart struct {
	AuthorizeURL string `json:"authorize_url"`
	State        string `json:"state"`
	Mock         bool   `json:"mock,omitempty"`
}

type quickBooksService struct {
	cfg *config.AppConfig
	svc *Service
}

func newQuickBooks(cfg *config.AppConfig, base *Service) *quickBooksService {
	return &quickBooksService{cfg: cfg, svc: base}
}

func (s *quickBooksService) StartOAuth(ctx context.Context, redirectURI string) (*QuickBooksOAuthStart, error) {
	def, ok := s.cfg.IntegrationByID(IDQuickBooks)
	if !ok || !def.Enabled {
		return nil, fmt.Errorf("quickbooks integration is disabled")
	}
	if def.OAuth == nil {
		return nil, fmt.Errorf("quickbooks oauth is not configured")
	}

	state := uuid.NewString()
	mock := s.cfg.MockQuickBooks() || os.Getenv("QUICKBOOKS_CLIENT_ID") == ""

	if mock {
		_, _ = s.svc.Upsert(ctx, IDQuickBooks, "pending", "", map[string]interface{}{
			"oauth_state": state,
			"mock":        true,
		})
		mockURL := redirectURI
		if mockURL == "" {
			mockURL = webAppURL(s.cfg) + "/settings/integrations?quickbooks=mock"
		}
		q := url.Values{}
		q.Set("state", state)
		q.Set("code", "mock_qb_code")
		return &QuickBooksOAuthStart{
			AuthorizeURL: mockURL + "?" + q.Encode(),
			State:        state,
			Mock:         true,
		}, nil
	}

	clientID := os.Getenv("QUICKBOOKS_CLIENT_ID")
	if clientID == "" {
		return nil, fmt.Errorf("QUICKBOOKS_CLIENT_ID is not set")
	}

	_, _ = s.svc.Upsert(ctx, IDQuickBooks, "pending", "", map[string]interface{}{
		"oauth_state": state,
	})

	q := url.Values{}
	q.Set("client_id", clientID)
	q.Set("response_type", "code")
	q.Set("scope", joinScopes(def.OAuth.Scopes))
	q.Set("redirect_uri", redirectURI)
	q.Set("state", state)

	return &QuickBooksOAuthStart{
		AuthorizeURL: def.OAuth.AuthorizeURL + "?" + q.Encode(),
		State:        state,
	}, nil
}

func (s *quickBooksService) CompleteOAuth(ctx context.Context, code, state string) (ConnectionStatus, error) {
	if code == "" {
		return ConnectionStatus{}, fmt.Errorf("authorization code is required")
	}

	st, err := s.svc.GetStatus(ctx, IDQuickBooks)
	if err != nil {
		return ConnectionStatus{}, err
	}
	saved, _ := st.Metadata["oauth_state"].(string)
	if saved == "" || state == "" || saved != state {
		return ConnectionStatus{}, fmt.Errorf("invalid oauth state")
	}

	realmID := "mock_realm_" + code
	if len(code) > 8 {
		realmID = "mock_realm_" + code[:8]
	}
	return s.svc.Upsert(ctx, IDQuickBooks, "connected", realmID, map[string]interface{}{
		"realm_id": realmID,
		"mock":     code == "mock_qb_code" || s.cfg.MockQuickBooks(),
	})
}

func joinScopes(scopes []string) string {
	out := ""
	for i, sc := range scopes {
		if i > 0 {
			out += " "
		}
		out += sc
	}
	return out
}

func webAppURL(cfg *config.AppConfig) string {
	if u := os.Getenv("WEB_APP_URL"); u != "" {
		return u
	}
	if domains, ok := cfg.Brand["domains"].(map[string]interface{}); ok {
		if app, ok := domains["app"].(string); ok && app != "" {
			return "https://" + app
		}
	}
	return "http://localhost:3000"
}
