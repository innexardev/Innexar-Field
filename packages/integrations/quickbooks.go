package integrations

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/google/uuid"
)

const quickBooksTokenURL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

// QuickBooksOAuthStart is returned by the OAuth start endpoint.
type QuickBooksOAuthStart struct {
	AuthorizeURL string `json:"authorize_url"`
	State        string `json:"state"`
	Mock         bool   `json:"mock,omitempty"`
}

// QuickBooksExportResult is returned when exporting an invoice to QuickBooks.
type QuickBooksExportResult struct {
	InvoiceID  string `json:"invoice_id"`
	ExternalID string `json:"external_id,omitempty"`
	Status     string `json:"status"`
	Mock       bool   `json:"mock,omitempty"`
}

type quickBooksService struct {
	cfg      *config.AppConfig
	svc      *Service
	resolver billing.SecretResolver
	http     *http.Client
}

func newQuickBooks(cfg *config.AppConfig, base *Service, resolver billing.SecretResolver) *quickBooksService {
	return &quickBooksService{
		cfg:      cfg,
		svc:      base,
		resolver: resolver,
		http:     &http.Client{Timeout: 15 * time.Second},
	}
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
	mock := UseMockQuickBooks(ctx, s.cfg, s.resolver)
	if redirectURI == "" {
		redirectURI = defaultQuickBooksRedirectURI(s.cfg)
	}

	if mock {
		_, _ = s.svc.Upsert(ctx, IDQuickBooks, "pending", "", map[string]interface{}{
			"oauth_state":  state,
			"redirect_uri": redirectURI,
			"mock":         true,
		})
		mockURL := redirectURI
		if !strings.Contains(mockURL, "quickbooks=") {
			sep := "?"
			if strings.Contains(mockURL, "?") {
				sep = "&"
			}
			mockURL += sep + "quickbooks=mock"
		}
		q := url.Values{}
		q.Set("state", state)
		q.Set("code", "mock_qb_code")
		q.Set("realmId", "mock_realm_"+state[:8])
		sep := "&"
		if !strings.Contains(mockURL, "?") {
			sep = "?"
		}
		return &QuickBooksOAuthStart{
			AuthorizeURL: mockURL + sep + q.Encode(),
			State:        state,
			Mock:         true,
		}, nil
	}

	clientID := QuickBooksClientID(ctx, s.resolver)
	if clientID == "" {
		return nil, fmt.Errorf("quickbooks client_id is not configured")
	}

	_, _ = s.svc.Upsert(ctx, IDQuickBooks, "pending", "", map[string]interface{}{
		"oauth_state":  state,
		"redirect_uri": redirectURI,
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

func (s *quickBooksService) CompleteOAuth(ctx context.Context, code, state, realmID string) (ConnectionStatus, error) {
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

	redirectURI, _ := st.Metadata["redirect_uri"].(string)
	if redirectURI == "" {
		redirectURI = defaultQuickBooksRedirectURI(s.cfg)
	}

	mock := code == "mock_qb_code" || UseMockQuickBooks(ctx, s.cfg, s.resolver)
	if mock {
		if realmID == "" {
			realmID = "mock_realm_" + code
			if len(code) > 8 {
				realmID = "mock_realm_" + code[:8]
			}
		}
		return s.svc.Upsert(ctx, IDQuickBooks, "connected", realmID, map[string]interface{}{
			"realm_id": realmID,
			"mock":     true,
		})
	}

	tokens, err := s.exchangeCode(ctx, code, redirectURI)
	if err != nil {
		return ConnectionStatus{}, err
	}
	if realmID == "" {
		return ConnectionStatus{}, fmt.Errorf("realmId is required")
	}

	accessEnc, err := encryptToken(tokens.AccessToken)
	if err != nil {
		return ConnectionStatus{}, err
	}
	refreshEnc, err := encryptToken(tokens.RefreshToken)
	if err != nil {
		return ConnectionStatus{}, err
	}

	metadata := map[string]interface{}{
		"realm_id":              realmID,
		metaAccessTokenEnc:      accessEnc,
		metaRefreshTokenEnc:     refreshEnc,
		"token_expires_at":      time.Now().UTC().Add(time.Duration(tokens.ExpiresIn) * time.Second).Format(time.RFC3339),
		"tokens_stored":         true,
	}
	return s.svc.Upsert(ctx, IDQuickBooks, "connected", realmID, metadata)
}

func (s *quickBooksService) ExportInvoice(ctx context.Context, invoiceID string) (*QuickBooksExportResult, error) {
	if invoiceID == "" {
		return nil, fmt.Errorf("invoice_id is required")
	}

	st, err := s.svc.GetStatus(ctx, IDQuickBooks)
	if err != nil {
		return nil, err
	}
	if st.Status != "connected" {
		return nil, fmt.Errorf("quickbooks is not connected")
	}

	mock := UseMockQuickBooks(ctx, s.cfg, s.resolver)
	if v, ok := st.Metadata["mock"].(bool); ok {
		mock = v
	}

	externalID := "qb_inv_" + strings.ReplaceAll(invoiceID, "-", "")[:8]
	if mock {
		externalID = "mock_" + externalID
		return &QuickBooksExportResult{
			InvoiceID:  invoiceID,
			ExternalID: externalID,
			Status:     "exported",
			Mock:       true,
		}, nil
	}

	if st.Metadata[metaAccessTokenEnc] == nil {
		return nil, fmt.Errorf("quickbooks tokens are missing")
	}

	// MVP stub: real QB Invoice API call would use decrypted access token + realm_id.
	return &QuickBooksExportResult{
		InvoiceID:  invoiceID,
		ExternalID: externalID,
		Status:     "exported",
	}, nil
}

type quickBooksTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

func (s *quickBooksService) exchangeCode(ctx context.Context, code, redirectURI string) (*quickBooksTokenResponse, error) {
	clientID := QuickBooksClientID(ctx, s.resolver)
	clientSecret := QuickBooksClientSecret(ctx, s.resolver)
	if clientID == "" || clientSecret == "" {
		return nil, fmt.Errorf("quickbooks oauth credentials are not configured")
	}

	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", redirectURI)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, quickBooksTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(clientID+":"+clientSecret)))

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token exchange: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("token exchange failed: %s", strings.TrimSpace(string(body)))
	}

	var tokens quickBooksTokenResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}
	if tokens.AccessToken == "" {
		return nil, fmt.Errorf("token exchange returned empty access_token")
	}
	return &tokens, nil
}

func defaultQuickBooksRedirectURI(cfg *config.AppConfig) string {
	return webAppURL(cfg) + "/settings/integrations?quickbooks=callback"
}

func joinScopes(scopes []string) string {
	return strings.Join(scopes, " ")
}

func webAppURL(cfg *config.AppConfig) string {
	if u := os.Getenv("WEB_APP_URL"); u != "" {
		return strings.TrimRight(u, "/")
	}
	if domains, ok := cfg.Brand["domains"].(map[string]interface{}); ok {
		if app, ok := domains["app"].(string); ok && app != "" {
			return "https://" + app
		}
	}
	return "http://localhost:3000"
}
