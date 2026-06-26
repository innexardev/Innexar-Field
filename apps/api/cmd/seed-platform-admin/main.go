package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/fieldforge/fieldforge/packages/core/db"
	"github.com/fieldforge/fieldforge/packages/core/platform"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	email := flag.String("email", env("PLATFORM_ADMIN_EMAIL", ""), "super_admin email")
	password := flag.String("password", env("PLATFORM_ADMIN_PASSWORD", ""), "super_admin password")
	flag.Parse()

	if *email == "" || *password == "" {
		log.Fatal("usage: seed-platform-admin --email admin@fieldforge.com --password <secret>\n       or set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD")
	}

	databaseURL := env("DATABASE_URL", "postgres://fieldforge:fieldforge@localhost:5432/fieldforge?sslmode=disable")
	ctx := context.Background()
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	id, err := platform.CreateSuperAdmin(ctx, pool.Pool, *email, *password)
	if err != nil {
		log.Fatalf("seed: %v", err)
	}
	fmt.Printf("created super_admin id=%s email=%s\n", id, *email)
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
