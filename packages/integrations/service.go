package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var memStore sync.Map // tenantID:integrationID -> ConnectionStatus (nil pool only)

// ConnectionStatus is persisted per tenant and integration.
type ConnectionStatus struct {
	IntegrationID string                 `json:"integration_id"`
	Status        string                 `json:"status"`
	ExternalID    string                 `json:"external_id,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
	ConnectedAt   *time.Time             `json:"connected_at,omitempty"`
	UpdatedAt     time.Time              `json:"updated_at"`
}

// Service manages tenant integration connection state.
type Service struct {
	pool     *pgxpool.Pool
	cfg      *config.AppConfig
	resolver billing.SecretResolver
}

func NewService(pool *pgxpool.Pool, cfg *config.AppConfig, resolver billing.SecretResolver) *Service {
	return &Service{pool: pool, cfg: cfg, resolver: resolver}
}

func (s *Service) ListStatus(ctx context.Context) ([]ConnectionStatus, error) {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return nil, fmt.Errorf("tenant context required")
	}

	catalog := Catalog(s.cfg)
	out := make([]ConnectionStatus, 0, len(catalog))
	for _, def := range catalog {
		st, err := s.load(ctx, tenantID, def.ID)
		if err != nil {
			return nil, err
		}
		if def.ID == IDStripeConnect {
			if st.Metadata == nil {
				st.Metadata = map[string]interface{}{}
			}
			st.Metadata["mock"] = billing.UseMockStripe(ctx, s.cfg, s.resolver)
		}
		out = append(out, st)
	}
	return out, nil
}

func (s *Service) GetStatus(ctx context.Context, integrationID string) (ConnectionStatus, error) {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return ConnectionStatus{}, fmt.Errorf("tenant context required")
	}
	return s.load(ctx, tenantID, integrationID)
}

func (s *Service) Upsert(ctx context.Context, integrationID, status, externalID string, metadata map[string]interface{}) (ConnectionStatus, error) {
	tenantID, ok := tenant.ID(ctx)
	if !ok {
		return ConnectionStatus{}, fmt.Errorf("tenant context required")
	}
	if metadata == nil {
		metadata = map[string]interface{}{}
	}

	var connectedAt *time.Time
	if status == "connected" {
		now := time.Now().UTC()
		connectedAt = &now
	}

	if s.pool == nil {
		st := ConnectionStatus{
			IntegrationID: integrationID,
			Status:        status,
			ExternalID:    externalID,
			Metadata:      metadata,
			ConnectedAt:   connectedAt,
			UpdatedAt:     time.Now().UTC(),
		}
		memStore.Store(tenantID+":"+integrationID, st)
		return st, nil
	}

	metaJSON, _ := json.Marshal(metadata)
	_, err := s.pool.Exec(ctx, `
		INSERT INTO tenant_integrations (tenant_id, integration_id, status, external_id, metadata, connected_at, updated_at)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, NOW())
		ON CONFLICT (tenant_id, integration_id) DO UPDATE SET
			status = EXCLUDED.status,
			external_id = COALESCE(NULLIF(EXCLUDED.external_id, ''), tenant_integrations.external_id),
			metadata = EXCLUDED.metadata,
			connected_at = COALESCE(EXCLUDED.connected_at, tenant_integrations.connected_at),
			updated_at = NOW()
	`, tenantID, integrationID, status, externalID, metaJSON, connectedAt)
	if err != nil {
		return ConnectionStatus{}, err
	}
	return s.load(ctx, tenantID, integrationID)
}

func (s *Service) Disconnect(ctx context.Context, integrationID string) (ConnectionStatus, error) {
	return s.Upsert(ctx, integrationID, "disconnected", "", map[string]interface{}{})
}

func (s *Service) load(ctx context.Context, tenantID, integrationID string) (ConnectionStatus, error) {
	var st ConnectionStatus
	st.IntegrationID = integrationID
	st.Status = "disconnected"
	st.Metadata = map[string]interface{}{}

	if s.pool == nil {
		if raw, ok := memStore.Load(tenantID + ":" + integrationID); ok {
			return raw.(ConnectionStatus), nil
		}
		st.UpdatedAt = time.Now().UTC()
		return st, nil
	}

	var metaJSON []byte
	err := s.pool.QueryRow(ctx, `
		SELECT status, COALESCE(external_id, ''), metadata, connected_at, updated_at
		FROM tenant_integrations
		WHERE tenant_id = $1 AND integration_id = $2
	`, tenantID, integrationID).Scan(&st.Status, &st.ExternalID, &metaJSON, &st.ConnectedAt, &st.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			st.UpdatedAt = time.Now().UTC()
			return st, nil
		}
		return ConnectionStatus{}, err
	}
	if len(metaJSON) > 0 {
		_ = json.Unmarshal(metaJSON, &st.Metadata)
	}
	return st, nil
}
