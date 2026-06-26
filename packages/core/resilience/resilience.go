package resilience

import (
	"context"
	"time"
)

// Retry runs fn up to attempts times with exponential backoff.
func Retry(ctx context.Context, attempts int, baseDelay time.Duration, fn func() error) error {
	var err error
	for i := 0; i < attempts; i++ {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		err = fn()
		if err == nil {
			return nil
		}
		delay := baseDelay * time.Duration(1<<uint(i))
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}
	}
	return err
}

// WithTimeout runs fn with a deadline.
func WithTimeout(parent context.Context, d time.Duration, fn func(ctx context.Context) error) error {
	ctx, cancel := context.WithTimeout(parent, d)
	defer cancel()
	return fn(ctx)
}
