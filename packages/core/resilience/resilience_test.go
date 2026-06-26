package resilience

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCircuitBreakerOpens(t *testing.T) {
	cb := NewCircuitBreaker(2, time.Second)
	errFail := errors.New("fail")

	assert.Error(t, cb.Execute(func() error { return errFail }))
	assert.Error(t, cb.Execute(func() error { return errFail }))
	assert.Equal(t, ErrCircuitOpen, cb.Execute(func() error { return nil }))
	assert.Equal(t, StateOpen, cb.State())
}

func TestCircuitBreakerHalfOpenRecovers(t *testing.T) {
	cb := NewCircuitBreaker(1, 20*time.Millisecond)
	_ = cb.Execute(func() error { return errors.New("fail") })
	assert.Equal(t, StateOpen, cb.State())

	time.Sleep(25 * time.Millisecond)
	assert.NoError(t, cb.Execute(func() error { return nil }))
	assert.Equal(t, StateClosed, cb.State())
}

func TestManagerDefaultStripe(t *testing.T) {
	mgr := DefaultManager()
	assert.NoError(t, mgr.Execute("stripe", func() error { return nil }))
}

func TestRetrySucceeds(t *testing.T) {
	attempts := 0
	err := Retry(context.Background(), 3, time.Millisecond, func() error {
		attempts++
		if attempts < 2 {
			return errors.New("retry")
		}
		return nil
	})
	assert.NoError(t, err)
	assert.Equal(t, 2, attempts)
}
