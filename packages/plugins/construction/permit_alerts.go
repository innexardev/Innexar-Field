package construction

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"fmt"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type PermitAlert struct {
	ID           string `json:"id"`
	PermitNumber string `json:"permit_number,omitempty"`
	PermitType   string `json:"permit_type"`
	Jurisdiction string `json:"jurisdiction,omitempty"`
	Status       string `json:"status"`
	ExpiresDate  string `json:"expires_date"`
	Severity     string `json:"severity"`
	DaysUntil    int    `json:"days_until"`
	Message      string `json:"message"`
}

func (p *Plugin) listProjectPermitAlerts(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Params("id")

	var exists bool
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND tenant_id = $2)
	`, projectID, tid).Scan(&exists)
	if err != nil || !exists {
		return fiber.NewError(404, "project not found")
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	horizon := today.AddDate(0, 0, 30)

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, permit_number, permit_type, jurisdiction, status, expires_date
		FROM permits
		WHERE tenant_id = $1 AND project_id = $2
		  AND expires_date IS NOT NULL
		  AND expires_date <= $3
		  AND status != 'rejected'
		ORDER BY expires_date ASC
	`, tid, projectID, horizon)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load permit alerts")
	}
	defer rows.Close()

	list := []PermitAlert{}
	for rows.Next() {
		var pm PermitAlert
		var permitNumber, jurisdiction *string
		var expiresDate time.Time
		if err := rows.Scan(&pm.ID, &permitNumber, &pm.PermitType, &jurisdiction, &pm.Status, &expiresDate); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load permit alerts")
		}
		if permitNumber != nil {
			pm.PermitNumber = *permitNumber
		}
		if jurisdiction != nil {
			pm.Jurisdiction = *jurisdiction
		}
		pm.ExpiresDate = expiresDate.Format("2006-01-02")
		daysUntil := int(expiresDate.Sub(today).Hours() / 24)
		pm.DaysUntil = daysUntil

		label := pm.PermitType
		if pm.PermitNumber != "" {
			label = pm.PermitNumber
		}

		switch {
		case daysUntil < 0:
			pm.Severity = "expired"
			pm.Message = label + " permit expired " + pm.ExpiresDate
		case daysUntil == 0:
			pm.Severity = "expires_today"
			pm.Message = label + " permit expires today"
		case daysUntil <= 7:
			pm.Severity = "expiring_soon"
			pm.Message = label + " permit expires in " + formatDays(daysUntil)
		default:
			pm.Severity = "expiring"
			pm.Message = label + " permit expires in " + formatDays(daysUntil)
		}
		list = append(list, pm)
	}
	if list == nil {
		list = []PermitAlert{}
	}
	return response.DataListWith(c, list, fiber.Map{"status": "stub"})
}

func formatDays(days int) string {
	if days == 1 {
		return "1 day"
	}
	return fmt.Sprintf("%d days", days)
}
