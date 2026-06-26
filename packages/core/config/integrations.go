package config

const (
	IntegrationQuickBooks    = "quickbooks"
	IntegrationAvalara       = "avalara"
	IntegrationStripeConnect = "stripe_connect"
)

// IntegrationOAuthConfig holds public OAuth metadata (no secrets).
type IntegrationOAuthConfig struct {
	AuthorizeURL string   `yaml:"authorize_url" json:"authorize_url"`
	Scopes       []string `yaml:"scopes" json:"scopes"`
}

// IntegrationConfig is a vendor entry from app.config.yaml integrations section.
type IntegrationConfig struct {
	ID          string                   `yaml:"id" json:"id"`
	Name        string                   `yaml:"name" json:"name"`
	Enabled     bool                     `yaml:"enabled" json:"enabled"`
	Category    string                   `yaml:"category" json:"category"`
	Description string                   `yaml:"description" json:"description"`
	Plans       []string                 `yaml:"plans" json:"plans,omitempty"`
	OAuth       *IntegrationOAuthConfig  `yaml:"oauth,omitempty" json:"oauth,omitempty"`
	MockRate    float64                  `yaml:"mock_rate_percent" json:"mock_rate_percent,omitempty"`
	ReturnPath  string                   `yaml:"onboarding_return_path" json:"onboarding_return_path,omitempty"`
	Env         map[string]string        `yaml:"env,omitempty" json:"-"`
}

// IntegrationCatalog returns enabled integrations from config.
func (c *AppConfig) IntegrationCatalog() []IntegrationConfig {
	out := make([]IntegrationConfig, 0, len(c.Integrations))
	for _, def := range c.Integrations {
		if !def.Enabled {
			continue
		}
		out = append(out, def)
	}
	return out
}

// IntegrationByID returns a single integration definition.
func (c *AppConfig) IntegrationByID(id string) (IntegrationConfig, bool) {
	for _, def := range c.IntegrationCatalog() {
		if def.ID == id {
			return def, true
		}
	}
	return IntegrationConfig{}, false
}

// MockAvalara returns true when tax should be simulated.
func (c *AppConfig) MockAvalara() bool {
	if f, ok := c.Debug.Features["mock_avalara"].(bool); ok {
		return f
	}
	return false
}

// AvalaraMockRate returns the configured mock sales tax rate (percent).
func (c *AppConfig) AvalaraMockRate() float64 {
	if def, ok := c.IntegrationByID(IntegrationAvalara); ok && def.MockRate > 0 {
		return def.MockRate
	}
	return 8.25
}

// PublicIntegrations returns integration catalog without env secret keys.
func (c *AppConfig) PublicIntegrations() []IntegrationConfig {
	return c.IntegrationCatalog()
}
