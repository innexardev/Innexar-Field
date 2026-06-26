package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

const idempotencyHeader = "Idempotency-Key"

// Idempotency replays cached POST responses when Idempotency-Key is present.
func Idempotency(pool *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Method() != fiber.MethodPost {
			return c.Next()
		}

		key := strings.TrimSpace(c.Get(idempotencyHeader))
		if key == "" {
			return c.Next()
		}

		tid, _ := c.Locals("tenant_id").(string)
		if tid == "" {
			return c.Next()
		}

		path := c.Path()
		var statusCode int
		var body []byte
		err := pool.QueryRow(c.UserContext(), `
			SELECT status_code, response
			FROM idempotency_keys
			WHERE tenant_id = $1 AND key = $2 AND path = $3
		`, tid, key, path).Scan(&statusCode, &body)
		if err == nil {
			c.Set("Idempotency-Replayed", "true")
			c.Set("Content-Type", "application/json")
			return c.Status(statusCode).Send(body)
		}

		if err := c.Next(); err != nil {
			return err
		}

		sc := c.Response().StatusCode()
		if sc >= 200 && sc < 300 {
			respBody := append([]byte(nil), c.Response().Body()...)
			_, _ = pool.Exec(c.UserContext(), `
				INSERT INTO idempotency_keys (key, tenant_id, path, method, status_code, response)
				VALUES ($1, $2, $3, 'POST', $4, $5::jsonb)
				ON CONFLICT (tenant_id, key) DO NOTHING
			`, key, tid, path, sc, respBody)
		}
		return nil
	}
}
