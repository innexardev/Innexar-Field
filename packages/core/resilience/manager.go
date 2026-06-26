package resilience

import (
	"sync"
	"time"
)

// BreakerConfig holds per-integration circuit breaker settings.
type BreakerConfig struct {
	Threshold    int
	ResetTimeout time.Duration
}

// DefaultBreakerConfig matches ADR-0004 (5 failures → open 30s).
var DefaultBreakerConfig = BreakerConfig{
	Threshold:    5,
	ResetTimeout: 30 * time.Second,
}

// Manager holds named circuit breakers for external integrations.
type Manager struct {
	mu       sync.RWMutex
	breakers map[string]*CircuitBreaker
	defaults BreakerConfig
}

// NewManager creates a manager with optional per-name overrides.
func NewManager(overrides map[string]BreakerConfig) *Manager {
	m := &Manager{
		breakers: make(map[string]*CircuitBreaker),
		defaults: DefaultBreakerConfig,
	}
	for name, cfg := range overrides {
		m.breakers[name] = NewCircuitBreaker(cfg.Threshold, cfg.ResetTimeout)
	}
	return m
}

// DefaultManager returns a manager with Stripe breaker pre-configured.
func DefaultManager() *Manager {
	return NewManager(map[string]BreakerConfig{
		"stripe": DefaultBreakerConfig,
	})
}

// Get returns the named breaker, creating one with defaults if missing.
func (m *Manager) Get(name string) *CircuitBreaker {
	m.mu.RLock()
	cb, ok := m.breakers[name]
	m.mu.RUnlock()
	if ok {
		return cb
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	if cb, ok = m.breakers[name]; ok {
		return cb
	}
	cb = NewCircuitBreaker(m.defaults.Threshold, m.defaults.ResetTimeout)
	m.breakers[name] = cb
	return cb
}

// Execute runs fn behind the named circuit breaker.
func (m *Manager) Execute(name string, fn func() error) error {
	return m.Get(name).Execute(fn)
}
