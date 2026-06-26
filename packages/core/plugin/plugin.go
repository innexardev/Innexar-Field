package plugin

import (
	"github.com/fieldforge/fieldforge/packages/core/storage"
	"github.com/gofiber/fiber/v2"
)

// Migration represents a database migration file.
type Migration struct {
	Version int
	Name    string
	UpSQL   string
}

// NavItem is exposed to the frontend for dynamic menus.
type NavItem struct {
	Label    string `json:"label"`
	Path     string `json:"path"`
	Icon     string `json:"icon"`
	PluginID string `json:"plugin_id"`
}

// Manifest describes a plugin for discovery and billing.
type Manifest struct {
	ID            string   `yaml:"id" json:"id"`
	Name          string   `yaml:"name" json:"name"`
	Version       string   `yaml:"version" json:"version"`
	Dependencies  []string `yaml:"dependencies" json:"dependencies"`
	IndustryPacks []string `yaml:"industry_packs" json:"industry_packs"`
	Permissions   []string `yaml:"permissions" json:"permissions"`
	Nav           []NavItem `yaml:"nav" json:"nav"`
}

// Plugin is the contract every business module implements.
type Plugin interface {
	Manifest() Manifest
	RegisterRoutes(router fiber.Router, deps Deps)
	Migrations() []Migration
}

// Deps are shared services injected into plugins.
type Deps struct {
	DB      DB
	Events  EventBus
	Config  AppConfig
	Storage *storage.Service
}

// DB is the minimal database interface plugins need.
type DB interface {
	Query(ctx interface{}, sql string, args ...interface{}) (Rows, error)
	QueryRow(ctx interface{}, sql string, args ...interface{}) Row
	Exec(ctx interface{}, sql string, args ...interface{}) (Result, error)
}

type Rows interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close() error
}

type Row interface {
	Scan(dest ...interface{}) error
}

type Result interface {
	RowsAffected() (int64, error)
}

// EventBus publishes domain events (outbox in production).
type EventBus interface {
	Publish(ctx interface{}, eventType string, payload interface{}) error
}

// AppConfig exposes safe config subset to plugins.
type AppConfig interface {
	Env() string
	IsDebug() bool
}
