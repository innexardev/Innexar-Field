package middleware

import (
	"os"
	"strings"
	"sync"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/gofiber/fiber/v2"
)

func rateLimitDisabled() bool {
	return os.Getenv("CI") == "1" || os.Getenv("E2E_TEST") == "1"
}

// RateLimit enforces per-key request limits using a fixed window counter.
func RateLimit(cfg config.RateLimitConfig, keyFn func(*fiber.Ctx) string) fiber.Handler {
	if cfg.Requests <= 0 {
		cfg.Requests = 1000
	}
	if cfg.WindowSeconds <= 0 {
		cfg.WindowSeconds = 60
	}
	window := time.Duration(cfg.WindowSeconds) * time.Second
	limiter := newFixedWindowLimiter(cfg.Requests, window)

	return func(c *fiber.Ctx) error {
		if rateLimitDisabled() {
			return c.Next()
		}
		key := strings.TrimSpace(keyFn(c))
		if key == "" {
			return c.Next()
		}

		allowed, remaining, resetAt := limiter.allow(key)
		c.Set("X-RateLimit-Limit", itoa(cfg.Requests))
		c.Set("X-RateLimit-Remaining", itoa(remaining))
		c.Set("X-RateLimit-Reset", itoa(int(resetAt.Unix())))

		if !allowed {
			retryAfter := int(time.Until(resetAt).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Set("Retry-After", itoa(retryAfter))
			return fiber.NewError(fiber.StatusTooManyRequests, "rate limit exceeded")
		}
		return c.Next()
	}
}

// PublicRateLimit limits unauthenticated routes by client IP.
func PublicRateLimit(cfg config.RateLimitConfig) fiber.Handler {
	return RateLimit(cfg, func(c *fiber.Ctx) string {
		return "ip:" + c.IP()
	})
}

// TenantRateLimit limits authenticated routes per tenant.
func TenantRateLimit(cfg config.RateLimitConfig) fiber.Handler {
	return RateLimit(cfg, func(c *fiber.Ctx) string {
		tid, _ := c.Locals("tenant_id").(string)
		if tid == "" {
			return ""
		}
		return "tenant:" + tid
	})
}

type windowBucket struct {
	count   int
	resetAt time.Time
}

type fixedWindowLimiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	store  map[string]*windowBucket
}

func newFixedWindowLimiter(limit int, window time.Duration) *fixedWindowLimiter {
	return &fixedWindowLimiter{
		limit:  limit,
		window: window,
		store:  make(map[string]*windowBucket),
	}
}

func (l *fixedWindowLimiter) allow(key string) (allowed bool, remaining int, resetAt time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	bucket, ok := l.store[key]
	if !ok || now.After(bucket.resetAt) {
		bucket = &windowBucket{count: 0, resetAt: now.Add(l.window)}
		l.store[key] = bucket
	}

	if bucket.count >= l.limit {
		return false, 0, bucket.resetAt
	}
	bucket.count++
	return true, l.limit - bucket.count, bucket.resetAt
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
