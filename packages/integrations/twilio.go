package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/resilience"
	"github.com/google/uuid"
)

const metaAuthTokenEnc = "auth_token_encrypted"

type TwilioSendRequest struct {
	To   string `json:"to"`
	Body string `json:"body"`
}

type TwilioSendResult struct {
	Mode      string `json:"mode"`
	Message   string `json:"message"`
	To        string `json:"to"`
	Body      string `json:"body,omitempty"`
	MessageID string `json:"message_id,omitempty"`
	Mock      bool   `json:"mock,omitempty"`
}

type TwilioConnectRequest struct {
	AccountSID string `json:"account_sid"`
	AuthToken  string `json:"auth_token"`
	FromNumber string `json:"from_number"`
}

type TwilioSender interface {
	Send(ctx context.Context, req TwilioSendRequest) (*TwilioSendResult, error)
	Available(ctx context.Context) bool
}

type twilioService struct {
	cfg      *config.AppConfig
	svc      *Service
	resolver billing.SecretResolver
	http     *http.Client
	breaker  *resilience.Manager
}

func newTwilio(cfg *config.AppConfig, base *Service, resolver billing.SecretResolver) *twilioService {
	return &twilioService{
		cfg: cfg, svc: base, resolver: resolver,
		http: &http.Client{Timeout: 15 * time.Second}, breaker: resilience.DefaultManager(),
	}
}

func NewTwilioSender(cfg *config.AppConfig, base *Service, resolver billing.SecretResolver) TwilioSender {
	return newTwilio(cfg, base, resolver)
}

func (s *twilioService) Connect(ctx context.Context, req TwilioConnectRequest) (ConnectionStatus, error) {
	def, ok := s.cfg.IntegrationByID(IDTwilio)
	if !ok || !def.Enabled {
		return ConnectionStatus{}, fmt.Errorf("twilio integration is disabled")
	}
	accountSID := strings.TrimSpace(req.AccountSID)
	fromNumber := strings.TrimSpace(req.FromNumber)
	authToken := strings.TrimSpace(req.AuthToken)
	if accountSID == "" || fromNumber == "" {
		return ConnectionStatus{}, fmt.Errorf("account_sid and from_number required")
	}
	mock := UseMockTwilio(ctx, s.cfg, s.resolver)
	if !mock && authToken == "" {
		return ConnectionStatus{}, fmt.Errorf("auth_token required")
	}
	meta := map[string]interface{}{"from_number": fromNumber}
	if mock {
		meta["mock"] = true
		return s.svc.Upsert(ctx, IDTwilio, "connected", accountSID, meta)
	}
	enc, err := encryptToken(authToken)
	if err != nil {
		return ConnectionStatus{}, err
	}
	meta[metaAuthTokenEnc] = enc
	return s.svc.Upsert(ctx, IDTwilio, "connected", accountSID, meta)
}

func (s *twilioService) Disconnect(ctx context.Context) (ConnectionStatus, error) {
	return s.svc.Disconnect(ctx, IDTwilio)
}

func (s *twilioService) Send(ctx context.Context, req TwilioSendRequest) (*TwilioSendResult, error) {
	def, ok := s.cfg.IntegrationByID(IDTwilio)
	if !ok || !def.Enabled {
		return nil, fmt.Errorf("twilio integration is disabled")
	}
	to := normalizePhone(req.To)
	if to == "" {
		return nil, fmt.Errorf("recipient phone required")
	}
	body := strings.TrimSpace(req.Body)
	if body == "" {
		return nil, fmt.Errorf("message body required")
	}
	resolved, mock, err := s.resolveCredentials(ctx)
	if err != nil {
		return nil, err
	}
	if mock || !resolved.ok {
		return &TwilioSendResult{
			Mode: "log", Message: "SMS logged (Twilio not configured or skip_sms_send enabled)",
			To: to, Body: body, Mock: true,
		}, nil
	}
	messageID, err := s.sendLive(ctx, resolved.creds, to, body)
	if err != nil {
		return nil, err
	}
	return &TwilioSendResult{Mode: "twilio", Message: "SMS sent via Twilio", To: to, Body: body, MessageID: messageID}, nil
}

func (s *twilioService) Available(ctx context.Context) bool {
	if UseMockTwilio(ctx, s.cfg, s.resolver) {
		return false
	}
	resolved, mock, err := s.resolveCredentials(ctx)
	return err == nil && !mock && resolved.ok
}

type resolvedTwilio struct {
	creds TwilioCredentials
	ok    bool
}

func (s *twilioService) resolveCredentials(ctx context.Context) (resolvedTwilio, bool, error) {
	if UseMockTwilio(ctx, s.cfg, s.resolver) {
		return resolvedTwilio{}, true, nil
	}
	if tenantCreds, ok, err := s.tenantCredentials(ctx); err != nil {
		return resolvedTwilio{}, false, err
	} else if ok {
		return resolvedTwilio{creds: tenantCreds, ok: true}, false, nil
	}
	if platformCreds, ok := ResolvePlatformTwilio(ctx, s.resolver); ok {
		return resolvedTwilio{creds: platformCreds, ok: true}, false, nil
	}
	return resolvedTwilio{}, false, nil
}

func (s *twilioService) tenantCredentials(ctx context.Context) (TwilioCredentials, bool, error) {
	st, err := s.svc.GetStatus(ctx, IDTwilio)
	if err != nil || st.Status != "connected" {
		return TwilioCredentials{}, false, err
	}
	accountSID := strings.TrimSpace(st.ExternalID)
	fromNumber := metadataString(st.Metadata, "from_number")
	if accountSID == "" || fromNumber == "" {
		return TwilioCredentials{}, false, nil
	}
	authToken := ""
	if enc, ok := st.Metadata[metaAuthTokenEnc].(string); ok && enc != "" {
		dec, err := decryptToken(enc)
		if err != nil {
			return TwilioCredentials{}, false, err
		}
		authToken = dec
	}
	if authToken == "" {
		authToken = TwilioAuthToken(ctx, s.resolver)
	}
	if authToken == "" {
		return TwilioCredentials{}, false, nil
	}
	return TwilioCredentials{AccountSID: accountSID, AuthToken: authToken, FromNumber: fromNumber}, true, nil
}

func (s *twilioService) sendLive(ctx context.Context, creds TwilioCredentials, to, body string) (string, error) {
	var messageID string
	err := s.breaker.Execute("twilio", func() error {
		id, sendErr := s.postMessage(ctx, creds, to, body)
		if sendErr != nil {
			return sendErr
		}
		messageID = id
		return nil
	})
	return messageID, err
}

func (s *twilioService) postMessage(ctx context.Context, creds TwilioCredentials, to, body string) (string, error) {
	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", url.PathEscape(creds.AccountSID))
	form := url.Values{}
	form.Set("To", to)
	form.Set("From", creds.FromNumber)
	form.Set("Body", body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("twilio request: %w", err)
	}
	req.SetBasicAuth(creds.AccountSID, creds.AuthToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := s.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("twilio send: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("twilio send failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	var out struct {
		SID string `json:"sid"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("twilio response: %w", err)
	}
	if out.SID == "" {
		return "SM" + uuid.NewString()[:8], nil
	}
	return out.SID, nil
}

func normalizePhone(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	var b strings.Builder
	for _, r := range raw {
		if r >= '0' && r <= '9' || r == '+' {
			b.WriteRune(r)
		}
	}
	out := b.String()
	if out == "" {
		return ""
	}
	if !strings.HasPrefix(out, "+") && len(out) == 10 {
		out = "+1" + out
	}
	return out
}

func metadataString(metadata map[string]interface{}, key string) string {
	if metadata == nil {
		return ""
	}
	v, ok := metadata[key]
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(s)
}
