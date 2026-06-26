package resilience

import (
	"errors"
	"sync"
	"time"
)

// BreakerState represents the circuit breaker state machine.
type BreakerState int

const (
	StateClosed BreakerState = iota
	StateOpen
	StateHalfOpen
)

func (s BreakerState) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// CircuitBreaker implements a three-state breaker (closed → open → half-open).
type CircuitBreaker struct {
	mu           sync.Mutex
	failures     int
	threshold    int
	resetTimeout time.Duration
	lastFailure  time.Time
	state        BreakerState
	halfOpenBusy bool
}

// NewCircuitBreaker creates a breaker with the given failure threshold and open duration.
func NewCircuitBreaker(threshold int, resetTimeout time.Duration) *CircuitBreaker {
	if threshold < 1 {
		threshold = 1
	}
	if resetTimeout <= 0 {
		resetTimeout = 30 * time.Second
	}
	return &CircuitBreaker{
		threshold:    threshold,
		resetTimeout: resetTimeout,
		state:        StateClosed,
	}
}

// State returns the current breaker state.
func (cb *CircuitBreaker) State() BreakerState {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.maybeTransitionToHalfOpen()
	return cb.state
}

// Execute runs fn when the circuit allows traffic.
func (cb *CircuitBreaker) Execute(fn func() error) error {
	if err := cb.beforeCall(); err != nil {
		return err
	}

	err := fn()
	cb.afterCall(err)
	return err
}

func (cb *CircuitBreaker) beforeCall() error {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.maybeTransitionToHalfOpen()

	switch cb.state {
	case StateOpen:
		return ErrCircuitOpen
	case StateHalfOpen:
		if cb.halfOpenBusy {
			return ErrCircuitOpen
		}
		cb.halfOpenBusy = true
	}
	return nil
}

func (cb *CircuitBreaker) afterCall(err error) {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if cb.state == StateHalfOpen {
		cb.halfOpenBusy = false
	}

	if err != nil {
		cb.failures++
		cb.lastFailure = time.Now()
		if cb.state == StateHalfOpen || cb.failures >= cb.threshold {
			cb.state = StateOpen
		}
		return
	}

	cb.failures = 0
	cb.state = StateClosed
}

func (cb *CircuitBreaker) maybeTransitionToHalfOpen() {
	if cb.state == StateOpen && time.Since(cb.lastFailure) > cb.resetTimeout {
		cb.state = StateHalfOpen
		cb.halfOpenBusy = false
	}
}

// ErrCircuitOpen is returned when the circuit breaker is open.
var ErrCircuitOpen = errors.New("circuit breaker open")
