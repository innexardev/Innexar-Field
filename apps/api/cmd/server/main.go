package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/fieldforge/fieldforge/apps/api/internal/server"
	"github.com/fieldforge/fieldforge/packages/core/db"
	"github.com/fieldforge/fieldforge/packages/core/events"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	"github.com/fieldforge/fieldforge/packages/core/platform"
	"github.com/fieldforge/fieldforge/packages/core/platformsettings"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/integrations"
	"github.com/fieldforge/fieldforge/packages/plugins/accounting"
	"github.com/fieldforge/fieldforge/packages/plugins/cleaning"
	"github.com/fieldforge/fieldforge/packages/plugins/communications"
	"github.com/fieldforge/fieldforge/packages/plugins/construction"
	"github.com/fieldforge/fieldforge/packages/plugins/crm"
	"github.com/fieldforge/fieldforge/packages/plugins/dispatch"
	"github.com/fieldforge/fieldforge/packages/plugins/estimating"
	"github.com/fieldforge/fieldforge/packages/plugins/expenses"
	"github.com/fieldforge/fieldforge/packages/plugins/invoicing"
	"github.com/fieldforge/fieldforge/packages/plugins/jobcosting"
	"github.com/fieldforge/fieldforge/packages/plugins/payroll"
	"github.com/fieldforge/fieldforge/packages/plugins/portal"
	"github.com/fieldforge/fieldforge/packages/plugins/scheduling"
	"github.com/joho/godotenv"
)

const defaultCORSOrigins = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://192.168.0.178:3000,http://192.168.0.178:3001,http://192.168.0.178:3002"

func main() {
	root := findRoot()
	_ = godotenv.Load(filepath.Join(root, ".env"))
	databaseURL := env("DATABASE_URL", "postgres://fieldforge:fieldforge@localhost:5432/fieldforge?sslmode=disable")

	ctx := context.Background()
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	if err := runMigrations(ctx, pool); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	reg := plugin.NewRegistry()
	_ = reg.Register(crm.New(pool.Pool))
	bus := server.NewEventBus(pool.Pool)
	_ = reg.Register(estimating.New(pool.Pool, bus))
	_ = reg.Register(portal.New(pool.Pool, nil, nil, bus, nil))
	schedPlugin := scheduling.New(pool.Pool, bus)
	_ = reg.Register(schedPlugin)
	invPlugin := invoicing.New(pool.Pool, bus)
	_ = reg.Register(invPlugin)
	_ = reg.Register(cleaning.New(pool.Pool))
	_ = reg.Register(construction.New(pool.Pool, bus))
	_ = reg.Register(dispatch.New(pool.Pool, bus))
	_ = reg.Register(expenses.New(pool.Pool, bus))
	_ = reg.Register(jobcosting.New(pool.Pool))
	_ = reg.Register(accounting.New(pool.Pool))
	_ = reg.Register(payroll.New(pool.Pool))
	commPlugin := communications.New(pool.Pool, nil, nil)
	_ = reg.Register(commPlugin)

	srv, err := server.New(server.Config{
		Root:       root,
		Port:       env("PORT", "8080"),
		Pool:       pool,
		Registry:   reg,
		EventBus:   bus,
		JWTSecret:  env("JWT_SECRET", "dev-change-me-in-production"),
		CORSOrigin: env("CORS_ORIGINS", defaultCORSOrigins),
	})
	if err != nil {
		log.Fatalf("server: %v", err)
	}

	pollCtx, pollCancel := context.WithCancel(context.Background())
	defer pollCancel()
	var pollerOpts []events.PollerOption
	if os.Getenv("E2E_TEST") == "1" {
		pollerOpts = append(pollerOpts, events.WithInterval(250*time.Millisecond))
	}
	outbox := events.NewPoller(pool.Pool, pollerOpts...)
	schedPlugin.RegisterOutboxHandlers(outbox)
	invPlugin.RegisterOutboxHandlers(outbox)
	commPlugin.RegisterOutboxHandlers(outbox)
	settingsStore, settingsErr := platformsettings.NewStore(pool.Pool)
	if settingsErr != nil {
		log.Fatalf("platform settings: %v", settingsErr)
	}
	integrations.RegisterOutboxHandlers(outbox, pool.Pool, srv.AppConfig(), settingsStore)
	srv.RegisterE2EOutboxPoll(outbox)
	go outbox.Run(pollCtx)

	go func() {
		log.Printf("API listening on :%s", srv.Port())
		if err := srv.Start(); err != nil {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	pollCancel()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

func runMigrations(ctx context.Context, pool *db.Pool) error {
	reg := plugin.NewRegistry()
	_ = reg.Register(crm.New(pool.Pool))
	bus := server.NewEventBus(pool.Pool)
	_ = reg.Register(estimating.New(pool.Pool, bus))
	_ = reg.Register(portal.New(pool.Pool, nil, nil, bus, nil))
	_ = reg.Register(scheduling.New(pool.Pool, bus))
	_ = reg.Register(invoicing.New(pool.Pool, bus))
	_ = reg.Register(cleaning.New(pool.Pool))
	_ = reg.Register(construction.New(pool.Pool, bus))
	_ = reg.Register(dispatch.New(pool.Pool, bus))
	_ = reg.Register(expenses.New(pool.Pool, bus))
	_ = reg.Register(jobcosting.New(pool.Pool))
	_ = reg.Register(accounting.New(pool.Pool))
	_ = reg.Register(payroll.New(pool.Pool))
	_ = reg.Register(communications.New(pool.Pool, nil, nil))

	var all []struct {
		Version int
		Name    string
		UpSQL   string
	}
	for _, m := range coremigrate.Core {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	for _, m := range platform.Migrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	for _, m := range reg.AllMigrations() {
		all = append(all, struct {
			Version int
			Name    string
			UpSQL   string
		}{m.Version, m.Name, m.UpSQL})
	}
	return pool.RunMigrations(ctx, all)
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func findRoot() string {
	dir, _ := os.Getwd()
	for {
		if _, err := os.Stat(filepath.Join(dir, "config", "app.config.yaml")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "."
		}
		dir = parent
	}
}
