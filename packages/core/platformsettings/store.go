package platformsettings

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/fieldforge/fieldforge/packages/core/secrets"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MaskedSecret is returned on GET — never includes the full value.
type MaskedSecret struct {
	Set   bool   `json:"set"`
	Last4 string `json:"last4,omitempty"`
}

// Store persists encrypted integration settings in platform_settings.
type Store struct {
	pool *pgxpool.Pool
	key  []byte

	mu    sync.RWMutex
	cache map[string]map[string]string
}

func NewStore(pool *pgxpool.Pool) (*Store, error) {
	key, err := secrets.KeyFromEnv()
	if err != nil {
		return nil, err
	}
	return &Store{pool: pool, key: key, cache: map[string]map[string]string{}}, nil
}

// Resolve returns env override when set, otherwise the decrypted DB value.
func (s *Store) Resolve(ctx context.Context, integrationKey, field, envVar string) string {
	if v := os.Getenv(envVar); v != "" {
		return v
	}
	vals, err := s.load(ctx, integrationKey)
	if err != nil || vals == nil {
		return ""
	}
	return vals[field]
}

func (s *Store) load(ctx context.Context, integrationKey string) (map[string]string, error) {
	s.mu.RLock()
	if cached, ok := s.cache[integrationKey]; ok {
		s.mu.RUnlock()
		return cached, nil
	}
	s.mu.RUnlock()

	var enc string
	err := s.pool.QueryRow(ctx, `
		SELECT value_encrypted FROM platform_settings WHERE key = $1
	`, integrationKey).Scan(&enc)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("load platform setting %q: %w", integrationKey, err)
	}
	plain, err := secrets.Decrypt(s.key, enc)
	if err != nil {
		return nil, fmt.Errorf("decrypt platform setting %q: %w", integrationKey, err)
	}
	vals := map[string]string{}
	if err := json.Unmarshal(plain, &vals); err != nil {
		return nil, fmt.Errorf("parse platform setting %q: %w", integrationKey, err)
	}

	s.mu.Lock()
	s.cache[integrationKey] = vals
	s.mu.Unlock()
	return vals, nil
}

func (s *Store) invalidate(integrationKey string) {
	s.mu.Lock()
	delete(s.cache, integrationKey)
	s.mu.Unlock()
}

// GetMasked returns integration settings with secret fields masked.
func (s *Store) GetMasked(ctx context.Context, integrationKey string, secretFields []string) (map[string]interface{}, error) {
	vals, err := s.load(ctx, integrationKey)
	if err != nil {
		return nil, err
	}
	secretSet := map[string]bool{}
	for _, f := range secretFields {
		secretSet[f] = true
	}
	out := map[string]interface{}{}
	for k, v := range vals {
		if secretSet[k] {
			out[k] = MaskedSecret{Set: v != "", Last4: secrets.MaskLast4(v)}
		} else {
			out[k] = v
		}
	}
	for _, f := range secretFields {
		if _, ok := out[f]; !ok {
			out[f] = MaskedSecret{}
		}
	}
	return out, nil
}

// MergeAndSave merges patch into existing values; empty patch values keep existing secrets.
func (s *Store) MergeAndSave(ctx context.Context, integrationKey string, patch map[string]string, secretFields []string, adminID string) error {
	existing, err := s.load(ctx, integrationKey)
	if err != nil {
		return err
	}
	if existing == nil {
		existing = map[string]string{}
	}
	secretSet := map[string]bool{}
	for _, f := range secretFields {
		secretSet[f] = true
	}
	for k, v := range patch {
		if v == "" && secretSet[k] {
			continue
		}
		existing[k] = v
	}
	raw, err := json.Marshal(existing)
	if err != nil {
		return fmt.Errorf("marshal settings: %w", err)
	}
	enc, err := secrets.Encrypt(s.key, raw)
	if err != nil {
		return fmt.Errorf("encrypt settings: %w", err)
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO platform_settings (key, value_encrypted, updated_by)
		VALUES ($1, $2, NULLIF($3, '')::uuid)
		ON CONFLICT (key) DO UPDATE SET
			value_encrypted = EXCLUDED.value_encrypted,
			updated_at = NOW(),
			updated_by = EXCLUDED.updated_by
	`, integrationKey, enc, adminID)
	if err != nil {
		return fmt.Errorf("save platform setting %q: %w", integrationKey, err)
	}
	s.invalidate(integrationKey)
	return nil
}
