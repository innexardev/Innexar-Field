package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAppConfig_RateLimitDefaults(t *testing.T) {
	cfg := &AppConfig{}
	public := cfg.PublicRateLimit()
	assert.Equal(t, 20, public.Requests)
	assert.Equal(t, 60, public.WindowSeconds)

	tenant := cfg.TenantRateLimit()
	assert.Equal(t, 1000, tenant.Requests)
	assert.Equal(t, 60, tenant.WindowSeconds)
}

func TestAppConfig_RateLimitFromConfig(t *testing.T) {
	cfg := &AppConfig{
		Security: SecurityConfig{
			RateLimit: RateLimitsConfig{
				Public: RateLimitConfig{Requests: 5, WindowSeconds: 30},
				Tenant: RateLimitConfig{Requests: 100, WindowSeconds: 10},
			},
		},
	}
	assert.Equal(t, 5, cfg.PublicRateLimit().Requests)
	assert.Equal(t, 100, cfg.TenantRateLimit().Requests)
}
