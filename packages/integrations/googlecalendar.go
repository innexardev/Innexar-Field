package integrations

import (
	"bytes"
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
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	googleCalendarTokenURL  = "https://oauth2.googleapis.com/token"
	googleCalendarEventsURL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
)

type GoogleCalendarOAuthStart struct {
	AuthorizeURL string `json:"authorize_url"`
	State        string `json:"state"`
	Mock         bool   `json:"mock,omitempty"`
}

type GoogleCalendarPushResult struct {
	JobID           string `json:"job_id"`
	ExternalEventID string `json:"external_event_id,omitempty"`
	Status          string `json:"status"`
	Mock            bool   `json:"mock,omitempty"`
}

type GoogleCalendarSyncResult struct {
	Pushed int  `json:"pushed"`
	Failed int  `json:"failed"`
	Mock   bool `json:"mock,omitempty"`
}

type googleCalendarService struct {
	cfg      *config.AppConfig
	svc      *Service
	pool     *pgxpool.Pool
	resolver billing.SecretResolver
	http     *http.Client
}

func newGoogleCalendar(cfg *config.AppConfig, base *Service, pool *pgxpool.Pool, resolver billing.SecretResolver) *googleCalendarService {
	return &googleCalendarService{
		cfg:      cfg,
		svc:      base,
		pool:     pool,
		resolver: resolver,
		http:     &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *googleCalendarService) StartOAuth(ctx context.Context, redirectURI string) (*GoogleCalendarOAuthStart, error) {
	def, ok := s.cfg.IntegrationByID(IDGoogleCalendar)
	if !ok || !def.Enabled {
		return nil, fmt.Errorf("google calendar integration is disabled")
	}
	if def.OAuth == nil {
		return nil, fmt.Errorf("google calendar oauth is not configured")
	}

	state := uuid.NewString()
	mock := UseMockGoogleCalendar(ctx, s.cfg, s.resolver)
	if redirectURI == "" {
		redirectURI = defaultGoogleCalendarRedirectURI(s.cfg)
	}

	if mock {
		_, _ = s.svc.Upsert(ctx, IDGoogleCalendar, "pending", "", map[string]interface{}{
			"oauth_state":  state,
			"redirect_uri": redirectURI,
			"mock":         true,
		})
		mockURL := redirectURI
		if !strings.Contains(mockURL, "google_calendar=") {
			sep := "?"
			if strings.Contains(mockURL, "?") {
				sep = "&"
			}
			mockURL += sep + "google_calendar=mock"
		}
		q := url.Values{}
		q.Set("state", state)
		q.Set("code", "mock_gc_code")
		sep := "&"
		if !strings.Contains(mockURL, "?") {
			sep = "?"
		}
		return &GoogleCalendarOAuthStart{
			AuthorizeURL: mockURL + sep + q.Encode(),
			State:        state,
			Mock:         true,
		}, nil
	}

	clientID := GoogleCalendarClientID(ctx, s.resolver)
	if clientID == "" {
		return nil, fmt.Errorf("google calendar client_id is not configured")
	}

	_, _ = s.svc.Upsert(ctx, IDGoogleCalendar, "pending", "", map[string]interface{}{
		"oauth_state":  state,
		"redirect_uri": redirectURI,
	})

	q := url.Values{}
	q.Set("client_id", clientID)
	q.Set("response_type", "code")
	q.Set("scope", joinScopes(def.OAuth.Scopes))
	q.Set("redirect_uri", redirectURI)
	q.Set("state", state)
	q.Set("access_type", "offline")
	q.Set("prompt", "consent")

	return &GoogleCalendarOAuthStart{
		AuthorizeURL: def.OAuth.AuthorizeURL + "?" + q.Encode(),
		State:        state,
	}, nil
}

func (s *googleCalendarService) CompleteOAuth(ctx context.Context, code, state string) (ConnectionStatus, error) {
	if code == "" {
		return ConnectionStatus{}, fmt.Errorf("authorization code is required")
	}

	st, err := s.svc.GetStatus(ctx, IDGoogleCalendar)
	if err != nil {
		return ConnectionStatus{}, err
	}
	saved, _ := st.Metadata["oauth_state"].(string)
	if saved == "" || state == "" || saved != state {
		return ConnectionStatus{}, fmt.Errorf("invalid oauth state")
	}

	redirectURI, _ := st.Metadata["redirect_uri"].(string)
	if redirectURI == "" {
		redirectURI = defaultGoogleCalendarRedirectURI(s.cfg)
	}

	mock := code == "mock_gc_code" || UseMockGoogleCalendar(ctx, s.cfg, s.resolver)
	if mock {
		return s.svc.Upsert(ctx, IDGoogleCalendar, "connected", "mock_calendar", map[string]interface{}{
			"calendar_id": "primary",
			"mock":        true,
		})
	}

	tokens, err := s.exchangeCode(ctx, code, redirectURI)
	if err != nil {
		return ConnectionStatus{}, err
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
		"calendar_id":       "primary",
		metaAccessTokenEnc:  accessEnc,
		metaRefreshTokenEnc: refreshEnc,
		"token_expires_at":  time.Now().UTC().Add(time.Duration(tokens.ExpiresIn) * time.Second).Format(time.RFC3339),
		"tokens_stored":     true,
	}
	return s.svc.Upsert(ctx, IDGoogleCalendar, "connected", "primary", metadata)
}

func (s *googleCalendarService) PushJob(ctx context.Context, jobID string) (*GoogleCalendarPushResult, error) {
	if jobID == "" {
		return nil, fmt.Errorf("job_id is required")
	}

	st, err := s.svc.GetStatus(ctx, IDGoogleCalendar)
	if err != nil {
		return nil, err
	}
	if st.Status != "connected" {
		return nil, fmt.Errorf("google calendar is not connected")
	}

	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return nil, fmt.Errorf("tenant context required")
	}

	var title, notes, status string
	var scheduledAt *time.Time
	var existingEventID *string
	err = s.pool.QueryRow(ctx, `
		SELECT title, COALESCE(notes, ''), status, scheduled_at, google_calendar_event_id
		FROM jobs
		WHERE id = $1 AND tenant_id = $2
	`, jobID, tenantID).Scan(&title, &notes, &status, &scheduledAt, &existingEventID)
	if err != nil {
		return nil, fmt.Errorf("load job: %w", err)
	}
	if scheduledAt == nil {
		return nil, fmt.Errorf("job has no scheduled_at")
	}
	if status == "cancelled" {
		return nil, fmt.Errorf("job is cancelled")
	}

	mock := UseMockGoogleCalendar(ctx, s.cfg, s.resolver)
	if v, ok := st.Metadata["mock"].(bool); ok {
		mock = v
	}

	endAt := scheduledAt.Add(2 * time.Hour)
	externalID := "gcal_evt_" + strings.ReplaceAll(jobID, "-", "")[:12]
	if mock {
		externalID = "mock_" + externalID
	} else if existingEventID != nil && *existingEventID != "" {
		externalID = *existingEventID
	}

	if !mock {
		accessToken, err := s.accessToken(ctx, st)
		if err != nil {
			return nil, err
		}
		externalID, err = s.upsertCalendarEvent(ctx, accessToken, externalID, title, notes, *scheduledAt, endAt)
		if err != nil {
			return nil, err
		}
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE jobs SET google_calendar_event_id = $3, updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, jobID, tenantID, externalID)
	if err != nil {
		return nil, fmt.Errorf("store calendar event id: %w", err)
	}

	return &GoogleCalendarPushResult{
		JobID:           jobID,
		ExternalEventID: externalID,
		Status:          "pushed",
		Mock:            mock,
	}, nil
}

func (s *googleCalendarService) SyncUpcoming(ctx context.Context) (*GoogleCalendarSyncResult, error) {
	st, err := s.svc.GetStatus(ctx, IDGoogleCalendar)
	if err != nil {
		return nil, err
	}
	if st.Status != "connected" {
		return nil, fmt.Errorf("google calendar is not connected")
	}

	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return nil, fmt.Errorf("tenant context required")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id::text
		FROM jobs
		WHERE tenant_id = $1
		  AND scheduled_at IS NOT NULL
		  AND scheduled_at >= NOW()
		  AND scheduled_at < NOW() + INTERVAL '30 days'
		  AND status NOT IN ('cancelled', 'completed')
		ORDER BY scheduled_at
		LIMIT 100
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list upcoming jobs: %w", err)
	}
	defer rows.Close()

	result := &GoogleCalendarSyncResult{Mock: UseMockGoogleCalendar(ctx, s.cfg, s.resolver)}
	if v, ok := st.Metadata["mock"].(bool); ok {
		result.Mock = v
	}

	for rows.Next() {
		var jobID string
		if err := rows.Scan(&jobID); err != nil {
			return nil, err
		}
		if _, err := s.PushJob(ctx, jobID); err != nil {
			result.Failed++
			continue
		}
		result.Pushed++
	}
	return result, nil
}

func (s *googleCalendarService) handleJobScheduled(ctx context.Context, tenantID string, payload json.RawMessage) error {
	var body struct {
		JobID string `json:"job_id"`
	}
	if err := json.Unmarshal(payload, &body); err != nil || body.JobID == "" {
		return nil
	}

	st, err := s.svc.GetStatus(tenant.WithID(ctx, tenantID), IDGoogleCalendar)
	if err != nil || st.Status != "connected" {
		return nil
	}

	_, err = s.PushJob(tenant.WithID(ctx, tenantID), body.JobID)
	return err
}

type googleTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

func (s *googleCalendarService) exchangeCode(ctx context.Context, code, redirectURI string) (*googleTokenResponse, error) {
	clientID := GoogleCalendarClientID(ctx, s.resolver)
	clientSecret := GoogleCalendarClientSecret(ctx, s.resolver)
	if clientID == "" || clientSecret == "" {
		return nil, fmt.Errorf("google calendar oauth credentials are not configured")
	}

	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", redirectURI)
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, googleCalendarTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token exchange: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("token exchange failed: %s", strings.TrimSpace(string(body)))
	}

	var tokens googleTokenResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}
	if tokens.AccessToken == "" {
		return nil, fmt.Errorf("token exchange returned empty access_token")
	}
	return &tokens, nil
}

func (s *googleCalendarService) accessToken(ctx context.Context, st ConnectionStatus) (string, error) {
	enc, _ := st.Metadata[metaAccessTokenEnc].(string)
	if enc == "" {
		return "", fmt.Errorf("google calendar tokens are missing")
	}
	return decryptToken(enc)
}

type calendarEventBody struct {
	Summary     string            `json:"summary"`
	Description string            `json:"description,omitempty"`
	Start       calendarEventTime `json:"start"`
	End         calendarEventTime `json:"end"`
}

type calendarEventTime struct {
	DateTime string `json:"dateTime"`
	TimeZone string `json:"timeZone"`
}

type calendarEventResponse struct {
	ID string `json:"id"`
}

func (s *googleCalendarService) upsertCalendarEvent(
	ctx context.Context,
	accessToken, eventID, title, notes string,
	start, end time.Time,
) (string, error) {
	body := calendarEventBody{
		Summary:     title,
		Description: notes,
		Start:       calendarEventTime{DateTime: start.UTC().Format(time.RFC3339), TimeZone: "UTC"},
		End:         calendarEventTime{DateTime: end.UTC().Format(time.RFC3339), TimeZone: "UTC"},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	method := http.MethodPost
	target := googleCalendarEventsURL
	if eventID != "" && !strings.HasPrefix(eventID, "gcal_evt_") && !strings.HasPrefix(eventID, "mock_") {
		method = http.MethodPut
		target = googleCalendarEventsURL + "/" + url.PathEscape(eventID)
	}

	req, err := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("calendar event request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("calendar event failed: %s", strings.TrimSpace(string(respBody)))
	}

	var created calendarEventResponse
	if err := json.Unmarshal(respBody, &created); err != nil {
		return "", fmt.Errorf("parse calendar event: %w", err)
	}
	if created.ID == "" {
		return eventID, nil
	}
	return created.ID, nil
}

func defaultGoogleCalendarRedirectURI(cfg *config.AppConfig) string {
	return webAppURL(cfg) + "/settings/integrations?google_calendar=callback"
}
