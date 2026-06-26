package scheduling

import (
	"strings"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const mobileFieldSQL = `
CREATE TABLE IF NOT EXISTS customer_signatures (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	job_id UUID,
	signer_name TEXT NOT NULL DEFAULT '',
	image_data TEXT NOT NULL,
	source TEXT NOT NULL DEFAULT 'pad',
	captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_signatures_tenant ON customer_signatures (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_signatures_job ON customer_signatures (tenant_id, job_id);
ALTER TABLE customer_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_signatures FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_signatures_tenant ON customer_signatures;
CREATE POLICY customer_signatures_tenant ON customer_signatures
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS vehicle_checks (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	vehicle_label TEXT NOT NULL DEFAULT '',
	odometer_miles INTEGER NOT NULL DEFAULT 0,
	fuel_level TEXT NOT NULL DEFAULT 'full',
	tires_ok BOOLEAN NOT NULL DEFAULT true,
	lights_ok BOOLEAN NOT NULL DEFAULT true,
	damage_notes TEXT DEFAULT '',
	job_id UUID,
	checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_checks_tenant ON vehicle_checks (tenant_id);
ALTER TABLE vehicle_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_checks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vehicle_checks_tenant ON vehicle_checks;
CREATE POLICY vehicle_checks_tenant ON vehicle_checks
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type CustomerSignature struct {
	ID         string    `json:"id"`
	JobID      string    `json:"job_id,omitempty"`
	SignerName string    `json:"signer_name"`
	ImageData  string    `json:"image_data"`
	Source     string    `json:"source"`
	CapturedAt time.Time `json:"captured_at"`
}

type VehicleCheck struct {
	ID            string    `json:"id"`
	VehicleLabel  string    `json:"vehicle_label"`
	OdometerMiles int       `json:"odometer_miles"`
	FuelLevel     string    `json:"fuel_level"`
	TiresOK       bool      `json:"tires_ok"`
	LightsOK      bool      `json:"lights_ok"`
	DamageNotes   string    `json:"damage_notes,omitempty"`
	JobID         string    `json:"job_id,omitempty"`
	CheckedAt     time.Time `json:"checked_at"`
}

func (p *Plugin) listSignatures(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id::text, COALESCE(job_id::text,''), signer_name, source, captured_at
		FROM customer_signatures
		WHERE tenant_id = $1
		ORDER BY captured_at DESC
		LIMIT 20
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list signatures")
	}
	defer rows.Close()

	var out []CustomerSignature
	for rows.Next() {
		var s CustomerSignature
		if err := rows.Scan(&s.ID, &s.JobID, &s.SignerName, &s.Source, &s.CapturedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to read signature")
		}
		out = append(out, s)
	}
	if out == nil {
		out = []CustomerSignature{}
	}
	return c.JSON(fiber.Map{"data": out})
}

func (p *Plugin) createSignature(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		SignerName string `json:"signer_name"`
		ImageData  string `json:"image_data"`
		JobID      string `json:"job_id"`
		Source     string `json:"source"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	body.SignerName = strings.TrimSpace(body.SignerName)
	body.ImageData = strings.TrimSpace(body.ImageData)
	if body.SignerName == "" || body.ImageData == "" {
		return fiber.NewError(400, "signer_name and image_data are required")
	}
	if len(body.ImageData) > 2_000_000 {
		return fiber.NewError(400, "image_data too large")
	}
	source := strings.TrimSpace(body.Source)
	if source == "" {
		source = "pad"
	}

	id := uuid.New()
	var capturedAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO customer_signatures (id, tenant_id, job_id, signer_name, image_data, source)
		VALUES ($1, $2, NULLIF($3,'')::uuid, $4, $5, $6)
		RETURNING captured_at
	`, id, tid, body.JobID, body.SignerName, body.ImageData, source).Scan(&capturedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to save signature")
	}

	return c.Status(201).JSON(CustomerSignature{
		ID:         id.String(),
		JobID:      body.JobID,
		SignerName: body.SignerName,
		ImageData:  body.ImageData,
		Source:     source,
		CapturedAt: capturedAt,
	})
}

func (p *Plugin) listVehicleChecks(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id::text, vehicle_label, odometer_miles, fuel_level, tires_ok, lights_ok,
			COALESCE(damage_notes,''), COALESCE(job_id::text,''), checked_at
		FROM vehicle_checks
		WHERE tenant_id = $1
		ORDER BY checked_at DESC
		LIMIT 20
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list vehicle checks")
	}
	defer rows.Close()

	var out []VehicleCheck
	for rows.Next() {
		var v VehicleCheck
		if err := rows.Scan(
			&v.ID, &v.VehicleLabel, &v.OdometerMiles, &v.FuelLevel, &v.TiresOK, &v.LightsOK,
			&v.DamageNotes, &v.JobID, &v.CheckedAt,
		); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to read vehicle check")
		}
		out = append(out, v)
	}
	if out == nil {
		out = []VehicleCheck{}
	}
	return c.JSON(fiber.Map{"data": out})
}

func (p *Plugin) createVehicleCheck(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		VehicleLabel  string `json:"vehicle_label"`
		OdometerMiles int    `json:"odometer_miles"`
		FuelLevel     string `json:"fuel_level"`
		TiresOK       *bool  `json:"tires_ok"`
		LightsOK      *bool  `json:"lights_ok"`
		DamageNotes   string `json:"damage_notes"`
		JobID         string `json:"job_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	body.VehicleLabel = strings.TrimSpace(body.VehicleLabel)
	if body.VehicleLabel == "" {
		return fiber.NewError(400, "vehicle_label is required")
	}
	if body.OdometerMiles < 0 {
		return fiber.NewError(400, "odometer_miles must be non-negative")
	}
	fuel := strings.TrimSpace(body.FuelLevel)
	if fuel == "" {
		fuel = "full"
	}
	tiresOK := true
	if body.TiresOK != nil {
		tiresOK = *body.TiresOK
	}
	lightsOK := true
	if body.LightsOK != nil {
		lightsOK = *body.LightsOK
	}

	id := uuid.New()
	var checkedAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO vehicle_checks (
			id, tenant_id, vehicle_label, odometer_miles, fuel_level, tires_ok, lights_ok, damage_notes, job_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9,'')::uuid)
		RETURNING checked_at
	`, id, tid, body.VehicleLabel, body.OdometerMiles, fuel, tiresOK, lightsOK, body.DamageNotes, body.JobID).Scan(&checkedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to save vehicle check")
	}

	return c.Status(201).JSON(VehicleCheck{
		ID:            id.String(),
		VehicleLabel:  body.VehicleLabel,
		OdometerMiles: body.OdometerMiles,
		FuelLevel:     fuel,
		TiresOK:       tiresOK,
		LightsOK:      lightsOK,
		DamageNotes:   body.DamageNotes,
		JobID:         body.JobID,
		CheckedAt:     checkedAt,
	})
}
