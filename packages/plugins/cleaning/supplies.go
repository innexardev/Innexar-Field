package cleaning

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const cleanSuppliesSQL = `
CREATE TABLE IF NOT EXISTS clean_supplies (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	name TEXT NOT NULL,
	unit TEXT NOT NULL DEFAULT 'each',
	on_hand INT NOT NULL DEFAULT 0,
	reorder_threshold INT NOT NULL DEFAULT 5,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT clean_supplies_tenant_name_unique UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_clean_supplies_tenant ON clean_supplies (tenant_id);
ALTER TABLE clean_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean_supplies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clean_supplies_tenant ON clean_supplies;
CREATE POLICY clean_supplies_tenant ON clean_supplies
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type Supply struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Unit             string    `json:"unit"`
	OnHand           int       `json:"on_hand"`
	ReorderThreshold int       `json:"reorder_threshold"`
	NeedsReorder     bool      `json:"needs_reorder"`
	CreatedAt        time.Time `json:"created_at,omitempty"`
}

var defaultSupplies = []struct {
	Name             string
	Unit             string
	OnHand           int
	ReorderThreshold int
}{
	{"All-purpose cleaner", "bottle", 12, 8},
	{"Microfiber cloths", "pack", 4, 6},
	{"Vacuum bags", "box", 2, 3},
	{"Glass cleaner", "bottle", 6, 5},
}

func (p *Plugin) listSupplies(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())

	if err := p.ensureDefaultSupplies(c, tid); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load supplies")
	}

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, name, unit, on_hand, reorder_threshold, created_at
		FROM clean_supplies
		WHERE tenant_id = $1
		ORDER BY name
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load supplies")
	}
	defer rows.Close()

	list := []Supply{}
	for rows.Next() {
		var s Supply
		if err := rows.Scan(&s.ID, &s.Name, &s.Unit, &s.OnHand, &s.ReorderThreshold, &s.CreatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load supplies")
		}
		s.NeedsReorder = s.OnHand <= s.ReorderThreshold
		list = append(list, s)
	}
	return response.DataListWith(c, list, fiber.Map{"status": "stub"})
}

func (p *Plugin) updateSupply(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())

	var body struct {
		ReorderThreshold *int `json:"reorder_threshold"`
		OnHand           *int `json:"on_hand"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.ReorderThreshold == nil && body.OnHand == nil {
		return fiber.NewError(400, "reorder_threshold or on_hand required")
	}
	if body.ReorderThreshold != nil && *body.ReorderThreshold < 0 {
		return fiber.NewError(400, "reorder_threshold must be non-negative")
	}
	if body.OnHand != nil && *body.OnHand < 0 {
		return fiber.NewError(400, "on_hand must be non-negative")
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE clean_supplies SET
			reorder_threshold = COALESCE($3, reorder_threshold),
			on_hand = COALESCE($4, on_hand),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.ReorderThreshold, body.OnHand)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "supply not found")
	}

	var s Supply
	err = p.pool.QueryRow(c.UserContext(), `
		SELECT id, name, unit, on_hand, reorder_threshold, created_at
		FROM clean_supplies WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&s.ID, &s.Name, &s.Unit, &s.OnHand, &s.ReorderThreshold, &s.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "supply not found")
	}
	s.NeedsReorder = s.OnHand <= s.ReorderThreshold
	return c.JSON(s)
}

func (p *Plugin) ensureDefaultSupplies(c *fiber.Ctx, tid string) error {
	var count int
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT COUNT(*) FROM clean_supplies WHERE tenant_id = $1
	`, tid).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	for _, item := range defaultSupplies {
		_, err := p.pool.Exec(c.UserContext(), `
			INSERT INTO clean_supplies (id, tenant_id, name, unit, on_hand, reorder_threshold)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (tenant_id, name) DO NOTHING
		`, uuid.New().String(), tid, item.Name, item.Unit, item.OnHand, item.ReorderThreshold)
		if err != nil {
			return err
		}
	}
	return nil
}
