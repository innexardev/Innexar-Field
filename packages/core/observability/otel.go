package observability

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Tracing is a no-op OpenTelemetry stub that propagates W3C trace context headers.
func Tracing() fiber.Handler {
	return func(c *fiber.Ctx) error {
		traceparent := c.Get("traceparent")
		if traceparent == "" {
			traceID := strings.ReplaceAll(uuid.New().String(), "-", "")
			spanID := strings.ReplaceAll(uuid.New().String(), "-", "")[:16]
			traceparent = "00-" + traceID + "-" + spanID + "-01"
		}
		c.Locals("trace_id", traceparent)
		c.Set("traceparent", traceparent)
		if tracestate := c.Get("tracestate"); tracestate != "" {
			c.Set("tracestate", tracestate)
		}
		return c.Next()
	}
}

// TraceIDFromContext returns the propagated trace ID when present.
func TraceIDFromContext(c *fiber.Ctx) string {
	if v, ok := c.Locals("trace_id").(string); ok {
		return v
	}
	return ""
}

// OTelEnabled reports whether full OpenTelemetry export should be enabled.
func OTelEnabled() bool {
	return os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT") != ""
}
