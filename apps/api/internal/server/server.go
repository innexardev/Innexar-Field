package server

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/auth"
	"github.com/fieldforge/fieldforge/packages/core/billing"
	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/db"
	"github.com/fieldforge/fieldforge/packages/core/events"
	"github.com/fieldforge/fieldforge/packages/core/featureflags"
	"github.com/fieldforge/fieldforge/packages/core/identity"
	"github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/observability"
	"github.com/fieldforge/fieldforge/apps/api/internal/public"
	"github.com/fieldforge/fieldforge/apps/api/internal/reports"
	"github.com/fieldforge/fieldforge/packages/core/onboarding"
	"github.com/fieldforge/fieldforge/packages/core/platform"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/storage"
	"github.com/fieldforge/fieldforge/packages/integrations"
	"github.com/fieldforge/fieldforge/packages/core/tenantplugins"
	"github.com/fieldforge/fieldforge/packages/plugins/estimating"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EventBus wraps events.Bus for plugin constructors.
type EventBus = events.Bus

func NewEventBus(pool *pgxpool.Pool) *events.Bus {
	return events.NewBus(pool)
}

type Config struct {
	Root       string
	Port       string
	Pool       *db.Pool
	Registry   *plugin.Registry
	EventBus   *events.Bus
	JWTSecret  string
	CORSOrigin string
}

type Server struct {
	app    *fiber.App
	port   string
	cfg    *config.AppConfig
	loader *config.Loader
}

func (s *Server) Port() string { return s.port }

func New(cfg Config) (*Server, error) {
	loader := config.NewLoader(cfg.Root)
	appCfg, err := loader.Load()
	if err != nil {
		return nil, err
	}

	authSvc := auth.NewService(cfg.JWTSecret, jwtExpiryHours())
	tenantPluginsSvc := tenantplugins.NewService(cfg.Pool.Pool)
	featureFlagsSvc := featureflags.NewService(cfg.Pool.Pool, appCfg)
	identitySvc := identity.NewService(cfg.Pool.Pool, authSvc, appCfg, seedDemo(appCfg))

	app := fiber.New(fiber.Config{
		AppName:      "FieldForge API",
		ErrorHandler: errorHandler,
	})

	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(observability.Tracing())
	app.Use(observability.RequestTiming())
	app.Use(logger.New())
	app.Use(middleware.CORS(cfg.CORSOrigin))
	observability.Init(appCfg.Version, appCfg.Environment)
	app.Get("/metrics", observability.MetricsHandler())

	// System routes (no auth)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	app.Get("/health/ready", func(c *fiber.Ctx) error {
		if err := cfg.Pool.Ping(c.UserContext()); err != nil {
			log.Printf("health/ready: database ping failed: %v", err)
			return c.Status(503).JSON(fiber.Map{"status": "not_ready", "error": "database unavailable"})
		}
		return c.JSON(fiber.Map{"status": "ready"})
	})

	api := app.Group("/api/v1")

	api.Get("/config/public", func(c *fiber.Ctx) error {
		return c.JSON(loader.PublicSubset(appCfg))
	})

	api.Get("/industry-packs", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"data": onboarding.ListPacks(appCfg)})
	})
	api.Get("/plugins", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"data": cfg.Registry.Manifests()})
	})

	// Auth routes (public rate limit)
	publicRL := middleware.PublicRateLimit(appCfg.PublicRateLimit())
	api.Post("/auth/signup", publicRL, func(c *fiber.Ctx) error {
		var req identity.SignupRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		res, err := identitySvc.Signup(c.UserContext(), req)
		if err != nil {
			var ve *identity.ValidationError
			if errors.As(err, &ve) {
				return fiber.NewError(400, ve.Error())
			}
			return fiber.NewError(500, "internal server error")
		}
		return c.Status(201).JSON(res)
	})
	api.Post("/auth/login", publicRL, func(c *fiber.Ctx) error {
		var req identity.LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}
		res, err := identitySvc.Login(c.UserContext(), req)
		if err != nil {
			if middleware.IsTenantSuspended(err) {
				return fiber.NewError(403, "tenant suspended")
			}
			return fiber.NewError(401, "invalid credentials")
		}
		return c.JSON(res)
	})

	api.Post("/public/contact", publicRL, public.ContactHandler(appCfg))
	api.Get("/public/marketing-content", publicRL, public.MarketingContentHandler(cfg.Root))

	billingSvc := billing.NewService(cfg.Pool.Pool, appCfg, billing.NewClient(appCfg))
	api.Post("/billing/webhook", billing.WebhookHandler(billingSvc))

	platformSvc := platform.NewService(cfg.Pool.Pool, authSvc, appCfg)
	platform.RegisterRoutes(api, platformSvc, authSvc, publicRL)

	if est, ok := cfg.Registry.Get("estimating"); ok {
		if pub, ok := est.(*estimating.Plugin); ok {
			pub.RegisterPublicRoutes(api.Group("/public"), publicRL)
		}
	}

	if appCfg.Debug.Enabled {
		api.Get("/debug/routes", func(c *fiber.Ctx) error {
			routes := []fiber.Map{}
			for _, r := range app.GetRoutes() {
				routes = append(routes, fiber.Map{"method": r.Method, "path": r.Path})
			}
			return c.JSON(fiber.Map{"routes": routes})
		})
	}

	protected := api.Group("",
		middleware.Auth(authSvc),
		middleware.RequireTenant(),
		middleware.RejectSuspendedTenant(cfg.Pool.Pool),
		middleware.TenantHeader(),
		middleware.FeatureGate(featureFlagsSvc),
		middleware.TenantRateLimit(appCfg.TenantRateLimit()),
		middleware.Idempotency(cfg.Pool.Pool),
		middleware.PluginGate(cfg.Registry, tenantPluginsSvc),
	)
	protected.Get("/auth/me", func(c *fiber.Ctx) error {
		uid := c.Locals("user_id").(string)
		u, err := identitySvc.Me(c.UserContext(), uid)
		if err != nil {
			return fiber.NewError(404, "not found")
		}
		return c.JSON(u)
	})
	identity.RegisterRoutes(protected, identitySvc)
	protected.Get("/feature-flags", func(c *fiber.Ctx) error {
		tid := c.Locals("tenant_id").(string)
		flags, err := featureFlagsSvc.Resolved(c.UserContext(), tid)
		if err != nil {
			return fiber.NewError(500, "failed to load feature flags")
		}
		return c.JSON(fiber.Map{"data": flags})
	})
	protected.Get("/nav", func(c *fiber.Ctx) error {
		tid := c.Locals("tenant_id").(string)
		enabled, err := tenantPluginsSvc.EnabledIDs(c.UserContext(), tid)
		if err != nil {
			return fiber.NewError(500, "failed to load navigation")
		}
		return c.JSON(fiber.Map{"data": cfg.Registry.NavItemsFor(enabled)})
	})
	protected.Get("/marketplace/plugins", func(c *fiber.Ctx) error {
		tid := c.Locals("tenant_id").(string)
		enabled, err := tenantPluginsSvc.EnabledIDs(c.UserContext(), tid)
		if err != nil {
			return fiber.NewError(500, "failed to load plugins")
		}
		enabledSet := make(map[string]bool, len(enabled))
		for _, id := range enabled {
			enabledSet[id] = true
		}
		type pluginCard struct {
			ID            string   `json:"id"`
			Name          string   `json:"name"`
			Version       string   `json:"version"`
			IndustryPacks []string `json:"industry_packs"`
			Enabled       bool     `json:"enabled"`
		}
		cards := make([]pluginCard, 0)
		for _, m := range cfg.Registry.Manifests() {
			cards = append(cards, pluginCard{
				ID:            m.ID,
				Name:          m.Name,
				Version:       m.Version,
				IndustryPacks: m.IndustryPacks,
				Enabled:       enabledSet[m.ID],
			})
		}
		return c.JSON(fiber.Map{"data": cards})
	})
	protected.Get("/notifications", func(c *fiber.Ctx) error {
		now := time.Now().UTC().Format(time.RFC3339)
		return c.JSON(fiber.Map{"data": []fiber.Map{
			{"id": "n1", "title": "Invoice paid", "body": "INV-demo01 — $125.00 received via card.", "category": "billing", "read": false, "created_at": now},
			{"id": "n2", "title": "Job completed", "body": "Alpha Team marked Oak St remodel complete.", "category": "operations", "read": false, "created_at": now},
			{"id": "n3", "title": "Estimate accepted", "body": "Downtown office clean quote was accepted.", "category": "sales", "read": true, "created_at": now},
		}})
	})
	reports.RegisterRoutes(protected, cfg.Pool.Pool)

	billing.RegisterRoutes(protected, billingSvc)

	onboardingSvc := onboarding.NewService(cfg.Pool.Pool, appCfg, cfg.Registry, cfg.EventBus)
	onboarding.RegisterRoutes(protected, onboardingSvc)

	uploadCfg := storage.LoadConfigFromEnv()
	uploadSvc := storage.NewService(uploadCfg)
	if uploadSvc.UseLocal() {
		app.Static("/uploads", uploadSvc.LocalDir())
	}
	storage.RegisterRoutes(protected, uploadSvc)

	integrations.RegisterRoutes(protected, cfg.Pool.Pool, appCfg)

	// Plugin routes (authenticated)
	pluginDeps := plugin.Deps{Config: appCfg}
	cfg.Registry.RegisterRoutes(protected, pluginDeps)

	return &Server{app: app, port: cfg.Port, cfg: appCfg, loader: loader}, nil
}

// RegisterE2EOutboxPoll exposes POST /e2e/outbox/poll when E2E_TEST=1 (no auth; system route).
func (s *Server) RegisterE2EOutboxPoll(poller interface {
	PollOnce(context.Context) error
}) {
	if os.Getenv("E2E_TEST") != "1" {
		return
	}
	s.app.Post("/e2e/outbox/poll", func(c *fiber.Ctx) error {
		if err := poller.PollOnce(c.UserContext()); err != nil {
			return fiber.NewError(500, err.Error())
		}
		return c.SendStatus(204)
	})
}

func (s *Server) Start() error {
	return s.app.Listen(":" + s.port)
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.app.ShutdownWithContext(ctx)
}

func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	msg := err.Error()
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		msg = e.Message
	}
	if code >= 500 {
		msg = "internal server error"
	}
	return c.Status(code).JSON(fiber.Map{
		"error": fiber.Map{"code": fmt.Sprintf("HTTP_%d", code), "message": msg},
	})
}

func jwtExpiryHours() int {
	if v := os.Getenv("JWT_EXPIRY_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return 24
}

func seedDemo(cfg *config.AppConfig) bool {
	if f, ok := cfg.Debug.Features["seed_demo_data"].(bool); ok {
		return f
	}
	return false
}

// Ensure AppConfig implements plugin.AppConfig at compile time in plugins via *config.AppConfig
