package scheduling

import (
	"context"
	"errors"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"
)

const crewMembersSQL = `
CREATE TABLE IF NOT EXISTS crew_members (
	crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
	employee_id UUID NOT NULL,
	tenant_id UUID NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (crew_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_crew_members_tenant ON crew_members (tenant_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_employee ON crew_members (tenant_id, employee_id);
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crew_members_tenant ON crew_members;
CREATE POLICY crew_members_tenant ON crew_members
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type CrewMember struct {
	CrewID     string `json:"crew_id"`
	EmployeeID string `json:"employee_id"`
	FirstName  string `json:"first_name,omitempty"`
	LastName   string `json:"last_name,omitempty"`
	Email      string `json:"email,omitempty"`
	CreatedAt  string `json:"created_at,omitempty"`
}

func (p *Plugin) crewExists(ctx context.Context, tenantID, crewID string) error {
	var exists int
	err := p.pool.QueryRow(ctx, `
		SELECT 1 FROM crews WHERE id = $1 AND tenant_id = $2
	`, crewID, tenantID).Scan(&exists)
	if err != nil {
		return fiber.NewError(404, "crew not found")
	}
	return nil
}

func (p *Plugin) syncCrewMemberCount(ctx context.Context, tenantID, crewID string) error {
	_, err := p.pool.Exec(ctx, `
		UPDATE crews SET
			member_count = (
				SELECT COUNT(*)::int FROM crew_members WHERE crew_id = $1 AND tenant_id = $2
			),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, crewID, tenantID)
	return err
}

func (p *Plugin) listCrewMembers(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	crewID := c.Params("id")
	if err := p.crewExists(c.UserContext(), tid, crewID); err != nil {
		return err
	}

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT cm.crew_id, cm.employee_id, COALESCE(e.first_name, ''), COALESCE(e.last_name, ''),
			COALESCE(e.email, ''), cm.created_at
		FROM crew_members cm
		LEFT JOIN employees e ON e.id = cm.employee_id AND e.tenant_id = cm.tenant_id
		WHERE cm.tenant_id = $1 AND cm.crew_id = $2
		ORDER BY cm.created_at
	`, tid, crewID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list crew members")
	}
	defer rows.Close()

	var list []CrewMember
	for rows.Next() {
		var m CrewMember
		var createdAt time.Time
		if err := rows.Scan(&m.CrewID, &m.EmployeeID, &m.FirstName, &m.LastName, &m.Email, &createdAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list crew members")
		}
		m.CreatedAt = createdAt.Format(time.RFC3339)
		list = append(list, m)
	}
	if list == nil {
		list = []CrewMember{}
	}
	return response.DataList(c, list)
}

func (p *Plugin) addCrewMember(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	crewID := c.Params("id")
	if err := p.crewExists(c.UserContext(), tid, crewID); err != nil {
		return err
	}

	var body struct {
		EmployeeID string `json:"employee_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.EmployeeID == "" {
		return fiber.NewError(400, "employee_id required")
	}

	var employeeExists int
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT 1 FROM employees WHERE id = $1 AND tenant_id = $2 AND status = 'active'
	`, body.EmployeeID, tid).Scan(&employeeExists)
	if err != nil {
		return fiber.NewError(404, "employee not found")
	}

	var createdAt time.Time
	err = p.pool.QueryRow(c.UserContext(), `
		INSERT INTO crew_members (crew_id, employee_id, tenant_id)
		VALUES ($1, $2, $3)
		RETURNING created_at
	`, crewID, body.EmployeeID, tid).Scan(&createdAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fiber.NewError(409, "employee already in crew")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to add crew member")
	}

	if err := p.syncCrewMemberCount(c.UserContext(), tid, crewID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update crew member count")
	}

	var m CrewMember
	err = p.pool.QueryRow(c.UserContext(), `
		SELECT cm.crew_id, cm.employee_id, COALESCE(e.first_name, ''), COALESCE(e.last_name, ''),
			COALESCE(e.email, ''), cm.created_at
		FROM crew_members cm
		LEFT JOIN employees e ON e.id = cm.employee_id AND e.tenant_id = cm.tenant_id
		WHERE cm.tenant_id = $1 AND cm.crew_id = $2 AND cm.employee_id = $3
	`, tid, crewID, body.EmployeeID).Scan(
		&m.CrewID, &m.EmployeeID, &m.FirstName, &m.LastName, &m.Email, &createdAt,
	)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load crew member")
	}
	m.CreatedAt = createdAt.Format(time.RFC3339)
	return c.Status(201).JSON(m)
}

func (p *Plugin) removeCrewMember(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	crewID := c.Params("id")
	employeeID := c.Params("employeeId")
	if err := p.crewExists(c.UserContext(), tid, crewID); err != nil {
		return err
	}

	tag, err := p.pool.Exec(c.UserContext(), `
		DELETE FROM crew_members
		WHERE crew_id = $1 AND employee_id = $2 AND tenant_id = $3
	`, crewID, employeeID, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to remove crew member")
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(404, "crew member not found")
	}

	if err := p.syncCrewMemberCount(c.UserContext(), tid, crewID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update crew member count")
	}
	return c.SendStatus(204)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
