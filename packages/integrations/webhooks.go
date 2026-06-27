package integrations

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SupportedWebhookEvents lists domain events tenants can subscribe to (Zapier/Make MVP).
var SupportedWebhookEvents = []string{
	"estimating.quote.accepted",
	"financial.invoice.paid",
	"financial.expense.approved",
	"operations.job.scheduled",
	"operations.job.completed",
	"operations.work_order.assigned",
}

// WebhookSubscription is a tenant outbound webhook endpoint.
type WebhookSubscription struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

// WebhookCreateRequest registers a new outbound webhook.
type WebhookCreateRequest struct {
	URL    string   `json:"url"`
	Events []string `json:"events"`
	Secret string   `json:"secret,omitempty"`
}

// WebhookDeliveryResult summarizes a delivery attempt.
type WebhookDeliveryResult struct {
	SubscriptionID string `json:"subscription_id"`
	Status         string `json:"status"`
	StatusCode     int    `json:"status_code,omitempty"`
	Mock           bool   `json:"mock,omitempty"`
}

type webhookService struct {
	pool *pgxpool.Pool
	cfg  *config.AppConfig
	http *http.Client
}

func newWebhookService(pool *pgxpool.Pool, cfg *config.AppConfig) *webhookService {
	return &webhookService{
		pool: pool,
		cfg:  cfg,
		http: &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *webhookService) List(ctx context.Context) ([]WebhookSubscription, error) {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return nil, fmt.Errorf("tenant context required")
	}
	if s.pool == nil {
		return []WebhookSubscription{}, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id::text, url, events, active, created_at
		FROM outbound_webhook_subscriptions
		WHERE tenant_id = $1
		ORDER BY created_at DESC
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list webhooks: %w", err)
	}
	defer rows.Close()

	list := make([]WebhookSubscription, 0)
	for rows.Next() {
		var sub WebhookSubscription
		var eventsJSON []byte
		if err := rows.Scan(&sub.ID, &sub.URL, &eventsJSON, &sub.Active, &sub.CreatedAt); err != nil {
			return nil, err
		}
		if len(eventsJSON) > 0 {
			_ = json.Unmarshal(eventsJSON, &sub.Events)
		}
		if sub.Events == nil {
			sub.Events = []string{}
		}
		list = append(list, sub)
	}
	return list, rows.Err()
}

func (s *webhookService) Create(ctx context.Context, req WebhookCreateRequest) (WebhookSubscription, error) {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return WebhookSubscription{}, fmt.Errorf("tenant context required")
	}
	url := strings.TrimSpace(req.URL)
	if url == "" || !strings.HasPrefix(url, "http") {
		return WebhookSubscription{}, fmt.Errorf("valid https url required")
	}
	events := normalizeWebhookEvents(req.Events)
	if len(events) == 0 {
		return WebhookSubscription{}, fmt.Errorf("at least one event required")
	}
	secret := strings.TrimSpace(req.Secret)
	if secret == "" {
		secret = uuid.NewString()
	}
	if s.pool == nil {
		return WebhookSubscription{
			ID: uuid.NewString(), URL: url, Events: events, Active: true, CreatedAt: time.Now().UTC(),
		}, nil
	}

	id := uuid.NewString()
	var createdAt time.Time
	eventsJSON, _ := json.Marshal(events)
	err := s.pool.QueryRow(ctx, `
		INSERT INTO outbound_webhook_subscriptions (id, tenant_id, url, secret, events, active)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING created_at
	`, id, tenantID, url, secret, eventsJSON).Scan(&createdAt)
	if err != nil {
		return WebhookSubscription{}, fmt.Errorf("create webhook: %w", err)
	}
	return WebhookSubscription{ID: id, URL: url, Events: events, Active: true, CreatedAt: createdAt}, nil
}

func (s *webhookService) Delete(ctx context.Context, id string) error {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return fmt.Errorf("tenant context required")
	}
	if s.pool == nil {
		return fmt.Errorf("webhook not found")
	}
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM outbound_webhook_subscriptions WHERE id = $1 AND tenant_id = $2
	`, id, tenantID)
	if err != nil || tag.RowsAffected() == 0 {
		return fmt.Errorf("webhook not found")
	}
	return nil
}

func (s *webhookService) SendTest(ctx context.Context, id string) (WebhookDeliveryResult, error) {
	payload := map[string]interface{}{
		"event":     "webhook.test",
		"tenant_id": mustTenantID(ctx),
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"data":      map[string]string{"message": "FieldForge webhook test"},
	}
	return s.deliverToSubscription(ctx, id, "webhook.test", payload)
}

func (s *webhookService) deliverEvent(ctx context.Context, tenantID, eventType string, payload json.RawMessage) error {
	if s.pool == nil {
		return nil
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, url, secret
		FROM outbound_webhook_subscriptions
		WHERE tenant_id = $1 AND active = true AND events @> $2::jsonb
	`, tenantID, mustJSONStringArray(eventType))
	if err != nil {
		return err
	}
	defer rows.Close()

	var data map[string]interface{}
	_ = json.Unmarshal(payload, &data)
	body := map[string]interface{}{
		"event":     eventType,
		"tenant_id": tenantID,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"data":      data,
	}

	for rows.Next() {
		var id, url, secret string
		if err := rows.Scan(&id, &url, &secret); err != nil {
			return err
		}
		_, _ = s.postWebhook(ctx, id, url, secret, eventType, body)
	}
	return rows.Err()
}

func (s *webhookService) deliverToSubscription(ctx context.Context, id, eventType string, body map[string]interface{}) (WebhookDeliveryResult, error) {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return WebhookDeliveryResult{}, fmt.Errorf("tenant context required")
	}
	if s.pool == nil {
		return WebhookDeliveryResult{SubscriptionID: id, Status: "mock", Mock: true}, nil
	}
	var url, secret string
	err := s.pool.QueryRow(ctx, `
		SELECT url, secret FROM outbound_webhook_subscriptions
		WHERE id = $1 AND tenant_id = $2 AND active = true
	`, id, tenantID).Scan(&url, &secret)
	if err != nil {
		return WebhookDeliveryResult{}, fmt.Errorf("webhook not found")
	}
	return s.postWebhook(ctx, id, url, secret, eventType, body)
}

func (s *webhookService) postWebhook(ctx context.Context, id, url, secret, eventType string, body map[string]interface{}) (WebhookDeliveryResult, error) {
	result := WebhookDeliveryResult{SubscriptionID: id}
	if s.cfg != nil && s.cfg.Debug.Enabled {
		if skip, ok := s.cfg.Debug.Features["skip_webhook_send"].(bool); ok && skip {
			result.Status = "mock"
			result.Mock = true
			return result, nil
		}
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return result, err
	}
	sig := signWebhookPayload(secret, payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return result, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-FieldForge-Event", eventType)
	req.Header.Set("X-FieldForge-Signature", sig)

	resp, err := s.http.Do(req)
	if err != nil {
		result.Status = "failed"
		return result, nil
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)

	result.StatusCode = resp.StatusCode
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		result.Status = "delivered"
	} else {
		result.Status = "failed"
	}
	return result, nil
}

func signWebhookPayload(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func normalizeWebhookEvents(events []string) []string {
	allowed := make(map[string]struct{}, len(SupportedWebhookEvents))
	for _, e := range SupportedWebhookEvents {
		allowed[e] = struct{}{}
	}
	out := make([]string, 0, len(events))
	seen := make(map[string]struct{})
	for _, e := range events {
		e = strings.TrimSpace(e)
		if _, ok := allowed[e]; !ok {
			continue
		}
		if _, dup := seen[e]; dup {
			continue
		}
		seen[e] = struct{}{}
		out = append(out, e)
	}
	return out
}

func mustTenantID(ctx context.Context) string {
	id, _ := tenant.ID(ctx)
	return id
}

func mustJSONStringArray(value string) string {
	b, _ := json.Marshal([]string{value})
	return string(b)
}
