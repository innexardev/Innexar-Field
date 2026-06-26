package observability

import (
	"strconv"
	"sync/atomic"
	"time"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total HTTP requests processed by the API.",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	httpRequestsInFlight = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "Number of HTTP requests currently being processed.",
		},
	)

	buildInfo = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "fieldforge_build_info",
			Help: "Static build metadata for the API process.",
		},
		[]string{"version", "environment"},
	)

	otelExportEnabled = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "fieldforge_otel_export_enabled",
			Help: "1 when OTEL_EXPORTER_OTLP_ENDPOINT is configured.",
		},
	)

	inFlightCount atomic.Int64
)

// Init records static build metadata exposed on /metrics.
func Init(version, environment string) {
	if version == "" {
		version = "dev"
	}
	if environment == "" {
		environment = "development"
	}
	buildInfo.WithLabelValues(version, environment).Set(1)
	if OTelEnabled() {
		otelExportEnabled.Set(1)
	}
}

// MetricsHandler exposes Prometheus metrics at /metrics.
func MetricsHandler() fiber.Handler {
	return adaptor.HTTPHandler(promhttp.Handler())
}

// RequestTiming records request count, duration, and in-flight gauge for Prometheus.
func RequestTiming() fiber.Handler {
	return func(c *fiber.Ctx) error {
		inFlightCount.Add(1)
		httpRequestsInFlight.Inc()
		start := time.Now()

		err := c.Next()

		inFlightCount.Add(-1)
		httpRequestsInFlight.Dec()

		status := strconv.Itoa(c.Response().StatusCode())
		method := c.Method()
		path := c.Route().Path
		if path == "" {
			path = c.Path()
		}

		httpRequestsTotal.WithLabelValues(method, path, status).Inc()
		httpRequestDuration.WithLabelValues(method, path).Observe(time.Since(start).Seconds())

		return err
	}
}
