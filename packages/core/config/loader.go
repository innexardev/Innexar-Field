package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Loader reads app.config.yaml with environment overrides.
type Loader struct {
	root string
}

func NewLoader(root string) *Loader {
	return &Loader{root: root}
}

// IndustryPackConfig defines modules provisioned during onboarding.
type IndustryPackConfig struct {
	ID          string   `yaml:"id"`
	Name        string   `yaml:"name"`
	Description string   `yaml:"description"`
	CoreModules []string `yaml:"core_modules"`
	Plugins     []string `yaml:"plugins"`
	Optional    []string `yaml:"optional"`
}

type AppConfig struct {
	Version       string                        `yaml:"version"`
	Environment   string                        `yaml:"environment"`
	Brand         map[string]interface{}        `yaml:"brand"`
	Pricing       map[string]interface{}        `yaml:"pricing"`
	IndustryPacks map[string]IndustryPackConfig `yaml:"industry_packs"`
	Integrations  map[string]IntegrationConfig  `yaml:"integrations"`
	Security      SecurityConfig                `yaml:"security"`
	Debug         DebugConfig                   `yaml:"debug"`
	Features      map[string]bool               `yaml:"features"`
	UX            map[string]interface{}        `yaml:"ux"`
	Contact       map[string]string             `yaml:"contact"`
}

// SecurityConfig holds API security limits (see docs/security/api-security.md).
type SecurityConfig struct {
	RateLimit RateLimitsConfig `yaml:"rate_limit"`
}

// RateLimitsConfig defines per-scope rate limits.
type RateLimitsConfig struct {
	Public RateLimitConfig `yaml:"public"`
	Tenant RateLimitConfig `yaml:"tenant"`
}

// RateLimitConfig is a fixed-window request limit.
type RateLimitConfig struct {
	Requests      int `yaml:"requests"`
	WindowSeconds int `yaml:"window_seconds"`
}

// PublicRateLimit returns public endpoint limits with defaults.
func (c *AppConfig) PublicRateLimit() RateLimitConfig {
	return c.rateLimitOrDefault(c.Security.RateLimit.Public, 20, 60)
}

// TenantRateLimit returns authenticated per-tenant limits with defaults.
func (c *AppConfig) TenantRateLimit() RateLimitConfig {
	return c.rateLimitOrDefault(c.Security.RateLimit.Tenant, 1000, 60)
}

func (c *AppConfig) rateLimitOrDefault(cfg RateLimitConfig, req, window int) RateLimitConfig {
	if cfg.Requests <= 0 {
		cfg.Requests = req
	}
	if cfg.WindowSeconds <= 0 {
		cfg.WindowSeconds = window
	}
	return cfg
}

type DebugConfig struct {
	Enabled bool                   `yaml:"enabled"`
	Features map[string]interface{} `yaml:"features"`
}

func (c *AppConfig) Env() string {
	return c.Environment
}

func (c *AppConfig) IsDebug() bool {
	return c.Debug.Enabled
}

// MockStripe returns true when payments should be simulated (no real Stripe calls).
func (c *AppConfig) MockStripe() bool {
	if f, ok := c.Debug.Features["mock_stripe"].(bool); ok {
		return f
	}
	return false
}

// MockQuickBooks returns true when QuickBooks OAuth should be simulated.
func (c *AppConfig) MockQuickBooks() bool {
	if f, ok := c.Debug.Features["mock_quickbooks"].(bool); ok {
		return f
	}
	return false
}

func (c *AppConfig) SkipSMSSend() bool {
	if f, ok := c.Debug.Features["skip_sms_send"].(bool); ok {
		return f
	}
	return false
}

func (l *Loader) Load() (*AppConfig, error) {
	basePath := filepath.Join(l.root, "config", "app.config.yaml")
	data, err := os.ReadFile(basePath)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg AppConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = cfg.Environment
	}
	envPath := filepath.Join(l.root, "config", "environments", env+".yaml")
	if envData, err := os.ReadFile(envPath); err == nil {
		var overlay map[string]interface{}
		if err := yaml.Unmarshal(envData, &overlay); err == nil {
			mergeMap(&cfg, overlay)
		}
	}
	cfg.Environment = env

	if v := os.Getenv("FF_DEBUG_ENABLED"); v == "true" {
		cfg.Debug.Enabled = true
	}
	return &cfg, nil
}

func (l *Loader) PublicSubset(cfg *AppConfig) map[string]interface{} {
	return map[string]interface{}{
		"brand":        cfg.Brand,
		"pricing":      publicPricing(cfg.Pricing),
		"features":     cfg.Features,
		"ux":           cfg.UX,
		"contact":      cfg.Contact,
		"integrations": cfg.PublicIntegrations(),
	}
}

func publicPricing(p map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{})
	for k, v := range p {
		out[k] = v
	}
	delete(out, "stripe_price_id")
	return out
}

func mergeMap(cfg *AppConfig, overlay map[string]interface{}) {
	if d, ok := overlay["debug"].(map[string]interface{}); ok {
		if enabled, ok := d["enabled"].(bool); ok {
			cfg.Debug.Enabled = enabled
		}
	}
	if env, ok := overlay["environment"].(string); ok {
		cfg.Environment = env
	}
}
