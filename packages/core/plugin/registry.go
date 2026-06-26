package plugin

import (
	"fmt"
	"sort"
	"sync"

	"github.com/gofiber/fiber/v2"
)

// Registry holds all registered plugins.
type Registry struct {
	mu      sync.RWMutex
	plugins map[string]Plugin
	order   []string
}

func NewRegistry() *Registry {
	return &Registry{
		plugins: make(map[string]Plugin),
	}
}

// Register adds a plugin; returns error on duplicate ID.
func (r *Registry) Register(p Plugin) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	m := p.Manifest()
	if m.ID == "" {
		return fmt.Errorf("plugin manifest missing id")
	}
	if _, exists := r.plugins[m.ID]; exists {
		return fmt.Errorf("plugin %q already registered", m.ID)
	}
	r.plugins[m.ID] = p
	r.order = append(r.order, m.ID)
	sort.Strings(r.order)
	return nil
}

// All returns plugins in sorted ID order.
func (r *Registry) All() []Plugin {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]Plugin, 0, len(r.order))
	for _, id := range r.order {
		out = append(out, r.plugins[id])
	}
	return out
}

// Get returns a plugin by ID.
func (r *Registry) Get(id string) (Plugin, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.plugins[id]
	return p, ok
}

// RegisterRoutes mounts all plugin routes under /api/v1/{pluginID}.
func (r *Registry) RegisterRoutes(api fiber.Router, deps Deps) {
	for _, p := range r.All() {
		m := p.Manifest()
		group := api.Group("/" + m.ID)
		p.RegisterRoutes(group, deps)
	}
}

// AllMigrations returns migrations sorted by version across plugins.
func (r *Registry) AllMigrations() []Migration {
	var all []Migration
	for _, p := range r.All() {
		all = append(all, p.Migrations()...)
	}
	sort.Slice(all, func(i, j int) bool {
		if all[i].Version == all[j].Version {
			return all[i].Name < all[j].Name
		}
		return all[i].Version < all[j].Version
	})
	return all
}

// NavItems aggregates navigation from all plugins.
func (r *Registry) NavItems() []NavItem {
	return r.NavItemsFor(nil)
}

// NavItemsFor returns nav entries for enabled plugin IDs. Nil or empty enables all.
func (r *Registry) NavItemsFor(enabled []string) []NavItem {
	allowAll := len(enabled) == 0
	allowed := make(map[string]bool, len(enabled))
	for _, id := range enabled {
		allowed[id] = true
	}

	items := make([]NavItem, 0)
	for _, p := range r.All() {
		m := p.Manifest()
		if !allowAll && !allowed[m.ID] {
			continue
		}
		for _, nav := range m.Nav {
			nav.PluginID = m.ID
			items = append(items, nav)
		}
	}
	return items
}

// Manifests returns all plugin manifests.
func (r *Registry) Manifests() []Manifest {
	out := make([]Manifest, 0)
	for _, p := range r.All() {
		out = append(out, p.Manifest())
	}
	return out
}
