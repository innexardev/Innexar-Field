package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"github.com/fieldforge/fieldforge/apps/api/internal/server"
	"github.com/fieldforge/fieldforge/packages/core/db"
	coremigrate "github.com/fieldforge/fieldforge/packages/core/migrations"
	"github.com/fieldforge/fieldforge/packages/core/platform"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
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

func main() {
	_ = godotenv.Load()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://fieldforge:fieldforge@localhost:5432/fieldforge?sslmode=disable"
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

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

	if err := pool.RunMigrations(ctx, all); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	log.Printf("migrations applied from %s", findRoot())
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
