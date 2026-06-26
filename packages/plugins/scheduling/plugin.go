package scheduling

import (
	"context"
	"github.com/fieldforge/fieldforge/packages/core/response"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/events"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct {
	pool *pgxpool.Pool
	bus  *events.Bus
}

func New(pool *pgxpool.Pool, bus *events.Bus) *Plugin {
	return &Plugin{pool: pool, bus: bus}
}

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "scheduling",
		Name:          "Scheduling",
		Version:       "1.0.0",
		Dependencies:  []string{"crm"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"scheduling.read", "scheduling.write"},
		Nav: []plugin.NavItem{
			{Label: "Jobs", Path: "/jobs", Icon: "calendar"},
			{Label: "Schedule", Path: "/schedule", Icon: "clock"},
			{Label: "Schedule Map", Path: "/schedule/map", Icon: "map-pin"},
			{Label: "Crews", Path: "/crews", Icon: "users"},
			{Label: "Routes", Path: "/routes", Icon: "clipboard-list"},
			{Label: "Recurring", Path: "/recurring", Icon: "repeat"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/schedule", p.getSchedule)
	router.Get("/map", p.getScheduleMap)
	router.Get("/routes", p.listRoutes)
	router.Get("/jobs", p.listJobs)
	router.Post("/jobs", p.createJob)
	router.Get("/jobs/:id", p.getJob)
	router.Patch("/jobs/:id", p.updateJob)
	router.Post("/jobs/:id/complete", p.completeJob)
	router.Get("/crews", p.listCrews)
	router.Post("/crews", p.createCrew)
	router.Get("/crews/:id", p.getCrew)
	router.Patch("/crews/:id", p.updateCrew)
	router.Delete("/crews/:id", p.deleteCrew)
	router.Get("/recurring-jobs", p.listRecurringJobs)
	router.Post("/recurring-jobs", p.createRecurringJob)
	router.Get("/recurring-jobs/:id", p.getRecurringJob)
	router.Patch("/recurring-jobs/:id", p.updateRecurringJob)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 120, Name: "jobs", UpSQL: jobsSQL},
		{Version: 121, Name: "scheduling_crews", UpSQL: crewsSQL},
		{Version: 122, Name: "scheduling_recurring_jobs", UpSQL: recurringJobsSQL},
		{Version: 123, Name: "jobs_assigned_to", UpSQL: jobsAssignedToSQL},
	}
}

const jobsAssignedToSQL = `
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_to UUID;
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs (tenant_id, assigned_to);
`

const jobsSQL = `
CREATE TABLE IF NOT EXISTS jobs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID,
	estimate_id UUID,
	title TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'scheduled',
	scheduled_at TIMESTAMPTZ,
	completed_at TIMESTAMPTZ,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jobs_tenant ON jobs;
CREATE POLICY jobs_tenant ON jobs USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const crewsSQL = `
CREATE TABLE IF NOT EXISTS crews (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	name TEXT NOT NULL,
	lead_name TEXT DEFAULT '',
	member_count INT NOT NULL DEFAULT 1,
	skills TEXT[] NOT NULL DEFAULT '{}',
	status TEXT NOT NULL DEFAULT 'active',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT crews_status_check CHECK (status IN ('active', 'off_duty', 'inactive'))
);
CREATE INDEX IF NOT EXISTS idx_crews_tenant ON crews (tenant_id);
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crews_tenant ON crews;
CREATE POLICY crews_tenant ON crews
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const recurringJobsSQL = `
CREATE TABLE IF NOT EXISTS recurring_jobs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_id UUID,
	crew_id UUID,
	job_id UUID,
	title TEXT NOT NULL,
	frequency TEXT NOT NULL DEFAULT 'weekly',
	next_occurrence TIMESTAMPTZ,
	active BOOLEAN NOT NULL DEFAULT true,
	notes TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT recurring_jobs_frequency_check CHECK (frequency IN ('weekly', 'biweekly', 'monthly'))
);
CREATE INDEX IF NOT EXISTS idx_recurring_jobs_tenant ON recurring_jobs (tenant_id);
ALTER TABLE recurring_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recurring_jobs_tenant ON recurring_jobs;
CREATE POLICY recurring_jobs_tenant ON recurring_jobs
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type Job struct {
	ID          string     `json:"id"`
	CustomerID  string     `json:"customer_id,omitempty"`
	EstimateID  string     `json:"estimate_id,omitempty"`
	Title       string     `json:"title"`
	Status      string     `json:"status"`
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Notes       string     `json:"notes,omitempty"`
	AssignedTo  string     `json:"assigned_to,omitempty"`
}

const jobSelectCols = `
	id, COALESCE(customer_id::text,''), COALESCE(estimate_id::text,''), title, status,
	scheduled_at, completed_at, notes, COALESCE(assigned_to::text,'')
`

func scanJob(scanner interface {
	Scan(dest ...any) error
}) (Job, error) {
	var j Job
	err := scanner.Scan(
		&j.ID, &j.CustomerID, &j.EstimateID, &j.Title, &j.Status,
		&j.ScheduledAt, &j.CompletedAt, &j.Notes, &j.AssignedTo,
	)
	return j, err
}

// employeeIDForUser resolves the payroll employee linked to an auth user.
func (p *Plugin) employeeIDForUser(ctx context.Context, tenantID, userID string) (string, error) {
	var employeeID string
	err := p.pool.QueryRow(ctx, `
		SELECT id::text FROM employees
		WHERE tenant_id = $1 AND user_id = $2::uuid AND status = 'active'
		LIMIT 1
	`, tenantID, userID).Scan(&employeeID)
	return employeeID, err
}

type ScheduleDay struct {
	Date string `json:"date"`
	Jobs []Job  `json:"jobs"`
}

func (p *Plugin) getSchedule(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	from, to := parseScheduleRange(c.Query("from"), c.Query("to"))

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT `+jobSelectCols+`
		FROM jobs
		WHERE tenant_id = $1
		  AND scheduled_at IS NOT NULL
		  AND scheduled_at >= $2
		  AND scheduled_at < $3
		ORDER BY scheduled_at
	`, tid, from, to)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load schedule")
	}
	defer rows.Close()

	byDate := make(map[string][]Job)
	list := make([]Job, 0)
	for rows.Next() {
		j, err := scanJob(rows)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load schedule")
		}
		list = append(list, j)
		if j.ScheduledAt != nil {
			key := j.ScheduledAt.UTC().Format("2006-01-02")
			byDate[key] = append(byDate[key], j)
		}
	}

	days := make([]ScheduleDay, 0)
	for date, jobs := range byDate {
		days = append(days, ScheduleDay{Date: date, Jobs: jobs})
	}
	return c.JSON(fiber.Map{
		"from":    from.Format(time.RFC3339),
		"to":      to.Format(time.RFC3339),
		"data":    list,
		"by_date": days,
	})
}

func parseScheduleRange(fromStr, toStr string) (time.Time, time.Time) {
	now := time.Now().UTC()
	from := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 0, 7)

	if fromStr != "" {
		if t, err := time.Parse(time.RFC3339, fromStr); err == nil {
			from = t.UTC()
		} else if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t.UTC()
		}
	}
	if toStr != "" {
		if t, err := time.Parse(time.RFC3339, toStr); err == nil {
			to = t.UTC()
		} else if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t.UTC().Add(24 * time.Hour)
		}
	}
	if !to.After(from) {
		to = from.AddDate(0, 0, 7)
	}
	return from, to
}

func (p *Plugin) listJobs(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	mine := c.Query("mine") == "true"

	var rows pgx.Rows
	var err error

	if mine {
		userID, ok := tenant.UserID(c.UserContext())
		if !ok {
			return response.DataList(c, []Job{})
		}
		employeeID, empErr := p.employeeIDForUser(c.UserContext(), tid, userID)
		if empErr != nil {
			return response.DataList(c, []Job{})
		}
		rows, err = p.pool.Query(c.UserContext(), `
			SELECT `+jobSelectCols+`
			FROM jobs
			WHERE tenant_id = $1
			  AND (assigned_to = $2::uuid OR assigned_to = $3::uuid)
			ORDER BY scheduled_at NULLS LAST
		`, tid, employeeID, userID)
	} else {
		rows, err = p.pool.Query(c.UserContext(), `
			SELECT `+jobSelectCols+`
			FROM jobs WHERE tenant_id = $1 ORDER BY scheduled_at NULLS LAST
		`, tid)
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list jobs")
	}
	defer rows.Close()
	var list []Job
	for rows.Next() {
		j, scanErr := scanJob(rows)
		if scanErr != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list jobs")
		}
		list = append(list, j)
	}
	return response.DataList(c, list)
}

func (p *Plugin) createJob(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Title       string `json:"title"`
		CustomerID  string `json:"customer_id"`
		EstimateID  string `json:"estimate_id"`
		ScheduledAt string `json:"scheduled_at"`
		Notes       string `json:"notes"`
		AssignedTo  string `json:"assigned_to"`
	}
	if err := c.BodyParser(&body); err != nil || body.Title == "" {
		return fiber.NewError(400, "title required")
	}
	id := uuid.New().String()
	var sched *time.Time
	if body.ScheduledAt != "" {
		t, err := time.Parse(time.RFC3339, body.ScheduledAt)
		if err == nil {
			sched = &t
		}
	}
	_, err := p.pool.Exec(c.UserContext(), `
		INSERT INTO jobs (id, tenant_id, customer_id, estimate_id, title, scheduled_at, notes, assigned_to)
		VALUES ($1, $2, NULLIF($3,'')::uuid, NULLIF($4,'')::uuid, $5, $6, $7, NULLIF($8,'')::uuid)
	`, id, tid, body.CustomerID, body.EstimateID, body.Title, sched, body.Notes, body.AssignedTo)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create job")
	}
	_ = p.bus.Publish(c.UserContext(), tid, "operations.job.scheduled", map[string]string{"job_id": id})
	return c.Status(201).JSON(Job{ID: id, Title: body.Title, Status: "scheduled", ScheduledAt: sched, Notes: body.Notes, AssignedTo: body.AssignedTo})
}

func (p *Plugin) getJob(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	j, err := scanJob(p.pool.QueryRow(c.UserContext(), `
		SELECT `+jobSelectCols+`
		FROM jobs WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid))
	if err != nil {
		return fiber.NewError(404, "not found")
	}
	return c.JSON(j)
}

func (p *Plugin) updateJob(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Title      *string `json:"title"`
		Status     *string `json:"status"`
		Notes      *string `json:"notes"`
		AssignedTo *string `json:"assigned_to"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	_, err := p.pool.Exec(c.UserContext(), `
		UPDATE jobs SET
			title = COALESCE($3, title),
			status = COALESCE($4, status),
			notes = COALESCE($5, notes),
			assigned_to = COALESCE(NULLIF($6,'')::uuid, assigned_to),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Title, body.Status, body.Notes, body.AssignedTo)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update job")
	}
	return p.getJob(c)
}

func (p *Plugin) completeJob(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE jobs SET status = 'completed', completed_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, id, tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "not found")
	}
	_ = p.bus.Publish(c.UserContext(), tid, "operations.job.completed", map[string]string{"job_id": id})
	return c.JSON(fiber.Map{"status": "completed", "job_id": id})
}

type Crew struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	LeadName    string   `json:"lead_name,omitempty"`
	MemberCount int      `json:"member_count"`
	Skills      []string `json:"skills"`
	Status      string   `json:"status"`
	CreatedAt   string   `json:"created_at,omitempty"`
}

type RecurringJob struct {
	ID             string     `json:"id"`
	CustomerID     string     `json:"customer_id,omitempty"`
	CrewID         string     `json:"crew_id,omitempty"`
	JobID          string     `json:"job_id,omitempty"`
	Title          string     `json:"title"`
	Frequency      string     `json:"frequency"`
	NextOccurrence *time.Time `json:"next_occurrence,omitempty"`
	Active         bool       `json:"active"`
	Notes          string     `json:"notes,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type RouteStop struct {
	JobID       string     `json:"job_id"`
	Title       string     `json:"title"`
	Order       int        `json:"order"`
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
}

type Route struct {
	ID               string      `json:"id"`
	CrewID           string      `json:"crew_id,omitempty"`
	CrewName         string      `json:"crew_name,omitempty"`
	Date             string      `json:"date"`
	Stops            []RouteStop `json:"stops"`
	StopCount        int         `json:"stop_count"`
	EstimatedMinutes int         `json:"estimated_minutes"`
}

type MapPin struct {
	ID     string  `json:"id"`
	Type   string  `json:"type"`
	Title  string  `json:"title"`
	Lat    float64 `json:"lat"`
	Lng    float64 `json:"lng"`
	Status string  `json:"status,omitempty"`
}

func scanCrew(id, name, leadName string, memberCount int, skills []string, status string, createdAt time.Time) Crew {
	if skills == nil {
		skills = []string{}
	}
	return Crew{
		ID: id, Name: name, LeadName: leadName, MemberCount: memberCount,
		Skills: skills, Status: status, CreatedAt: createdAt.Format(time.RFC3339),
	}
}

func (p *Plugin) listCrews(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, name, lead_name, member_count, skills, status, created_at
		FROM crews WHERE tenant_id = $1 ORDER BY name
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list crews")
	}
	defer rows.Close()

	var list []Crew
	for rows.Next() {
		var id, name, leadName, status string
		var memberCount int
		var skills []string
		var createdAt time.Time
		if err := rows.Scan(&id, &name, &leadName, &memberCount, &skills, &status, &createdAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list crews")
		}
		list = append(list, scanCrew(id, name, leadName, memberCount, skills, status, createdAt))
	}
	if list == nil {
		list = []Crew{}
	}
	return response.DataList(c, list)
}

func (p *Plugin) createCrew(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name        string   `json:"name"`
		LeadName    string   `json:"lead_name"`
		MemberCount int      `json:"member_count"`
		Skills      []string `json:"skills"`
		Status      string   `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil || body.Name == "" {
		return fiber.NewError(400, "name required")
	}
	if body.MemberCount < 1 {
		body.MemberCount = 1
	}
	if body.Status == "" {
		body.Status = "active"
	}
	if body.Skills == nil {
		body.Skills = []string{}
	}
	id := uuid.New().String()
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO crews (id, tenant_id, name, lead_name, member_count, skills, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at
	`, id, tid, body.Name, body.LeadName, body.MemberCount, body.Skills, body.Status).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create crew")
	}
	return c.Status(201).JSON(scanCrew(id, body.Name, body.LeadName, body.MemberCount, body.Skills, body.Status, createdAt))
}

func (p *Plugin) getCrew(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var id, name, leadName, status string
	var memberCount int
	var skills []string
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, name, lead_name, member_count, skills, status, created_at
		FROM crews WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&id, &name, &leadName, &memberCount, &skills, &status, &createdAt)
	if err != nil {
		return fiber.NewError(404, "crew not found")
	}
	return c.JSON(scanCrew(id, name, leadName, memberCount, skills, status, createdAt))
}

func (p *Plugin) updateCrew(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Name        *string  `json:"name"`
		LeadName    *string  `json:"lead_name"`
		MemberCount *int     `json:"member_count"`
		Skills      []string `json:"skills"`
		Status      *string  `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE crews SET
			name = COALESCE($3, name),
			lead_name = COALESCE($4, lead_name),
			member_count = COALESCE($5, member_count),
			skills = COALESCE($6, skills),
			status = COALESCE($7, status),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Name, body.LeadName, body.MemberCount, body.Skills, body.Status)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "crew not found")
	}
	return p.getCrew(c)
}

func (p *Plugin) deleteCrew(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	tag, err := p.pool.Exec(c.UserContext(), `
		DELETE FROM crews WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "crew not found")
	}
	return c.SendStatus(204)
}

func parseRouteDate(dateStr string) time.Time {
	now := time.Now().UTC()
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	if dateStr != "" {
		if t, err := time.Parse("2006-01-02", dateStr); err == nil {
			day = t.UTC()
		}
	}
	return day
}

func (p *Plugin) listRoutes(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	day := parseRouteDate(c.Query("date"))
	nextDay := day.Add(24 * time.Hour)

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT j.id, j.title, j.scheduled_at
		FROM jobs j
		WHERE j.tenant_id = $1
		  AND j.scheduled_at IS NOT NULL
		  AND j.scheduled_at >= $2
		  AND j.scheduled_at < $3
		  AND j.status != 'completed'
		ORDER BY j.scheduled_at
	`, tid, day, nextDay)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list routes")
	}
	defer rows.Close()

	stops := make([]RouteStop, 0)
	order := 1
	for rows.Next() {
		var stop RouteStop
		if err := rows.Scan(&stop.JobID, &stop.Title, &stop.ScheduledAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list routes")
		}
		stop.Order = order
		order++
		stops = append(stops, stop)
	}

	routes := []Route{{
		ID:               uuid.New().String(),
		Date:             day.Format("2006-01-02"),
		Stops:            stops,
		StopCount:        len(stops),
		EstimatedMinutes: len(stops) * 45,
	}}
	if routes[0].Stops == nil {
		routes[0].Stops = []RouteStop{}
	}
	return response.DataListWith(c, routes, fiber.Map{"date": day.Format("2006-01-02"), "optimized": false})
}

func (p *Plugin) getScheduleMap(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	from, to := parseScheduleRange(c.Query("from"), c.Query("to"))

	jobRows, err := p.pool.Query(c.UserContext(), `
		SELECT id, title, status, scheduled_at
		FROM jobs
		WHERE tenant_id = $1
		  AND scheduled_at IS NOT NULL
		  AND scheduled_at >= $2
		  AND scheduled_at < $3
		ORDER BY scheduled_at
		LIMIT 50
	`, tid, from, to)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load schedule map")
	}
	defer jobRows.Close()

	pins := make([]MapPin, 0)
	idx := 0
	for jobRows.Next() {
		var id, title, status string
		var scheduledAt *time.Time
		if err := jobRows.Scan(&id, &title, &status, &scheduledAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load schedule map")
		}
		lat, lng := stubCoordinates(id, idx)
		pins = append(pins, MapPin{ID: id, Type: "job", Title: title, Lat: lat, Lng: lng, Status: status})
		idx++
	}

	crewRows, err := p.pool.Query(c.UserContext(), `
		SELECT id, name, status FROM crews WHERE tenant_id = $1 AND status = 'active' LIMIT 20
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load schedule map")
	}
	defer crewRows.Close()

	for crewRows.Next() {
		var id, name, status string
		if err := crewRows.Scan(&id, &name, &status); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load schedule map")
		}
		lat, lng := stubCoordinates(id, idx+100)
		pins = append(pins, MapPin{ID: id, Type: "crew", Title: name, Lat: lat, Lng: lng, Status: status})
		idx++
	}

	return c.JSON(fiber.Map{
		"from": from.Format(time.RFC3339),
		"to":   to.Format(time.RFC3339),
		"data": pins,
	})
}

func stubCoordinates(seed string, offset int) (float64, float64) {
	base := 0.0
	for _, ch := range seed {
		base += float64(ch)
	}
	lat := 37.77 + float64(offset%20)*0.01 + (base/1000.0)*0.001
	lng := -122.42 + float64(offset%15)*0.01 + (base/2000.0)*0.001
	return lat, lng
}

func (p *Plugin) listRecurringJobs(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), COALESCE(crew_id::text,''), COALESCE(job_id::text,''),
			title, frequency, next_occurrence, active, notes, created_at
		FROM recurring_jobs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list recurring jobs")
	}
	defer rows.Close()

	var list []RecurringJob
	for rows.Next() {
		var rj RecurringJob
		if err := rows.Scan(&rj.ID, &rj.CustomerID, &rj.CrewID, &rj.JobID, &rj.Title, &rj.Frequency, &rj.NextOccurrence, &rj.Active, &rj.Notes, &rj.CreatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list recurring jobs")
		}
		list = append(list, rj)
	}
	if list == nil {
		list = []RecurringJob{}
	}
	return response.DataList(c, list)
}

func (p *Plugin) createRecurringJob(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		CustomerID     string `json:"customer_id"`
		CrewID         string `json:"crew_id"`
		JobID          string `json:"job_id"`
		Title          string `json:"title"`
		Frequency      string `json:"frequency"`
		NextOccurrence string `json:"next_occurrence"`
		Notes          string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.Title == "" {
		body.Title = defaultRecurringTitle(body.Frequency)
	}
	if body.Frequency == "" {
		body.Frequency = "weekly"
	}
	id := uuid.New().String()
	var next *time.Time
	if body.NextOccurrence != "" {
		if t, err := time.Parse(time.RFC3339, body.NextOccurrence); err == nil {
			next = &t
		}
	}
	if next == nil {
		t := time.Now().UTC().Add(7 * 24 * time.Hour)
		next = &t
	}
	var createdAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO recurring_jobs (id, tenant_id, customer_id, crew_id, job_id, title, frequency, next_occurrence, notes)
		VALUES ($1, $2, NULLIF($3,'')::uuid, NULLIF($4,'')::uuid, NULLIF($5,'')::uuid, $6, $7, $8, $9)
		RETURNING created_at
	`, id, tid, body.CustomerID, body.CrewID, body.JobID, body.Title, body.Frequency, next, body.Notes).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create recurring job")
	}
	return c.Status(201).JSON(RecurringJob{
		ID: id, CustomerID: body.CustomerID, CrewID: body.CrewID, JobID: body.JobID,
		Title: body.Title, Frequency: body.Frequency, NextOccurrence: next, Active: true,
		Notes: body.Notes, CreatedAt: createdAt,
	})
}

func defaultRecurringTitle(frequency string) string {
	switch frequency {
	case "biweekly":
		return "Biweekly service"
	case "monthly":
		return "Monthly service"
	default:
		return "Weekly service"
	}
}

func (p *Plugin) getRecurringJob(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var rj RecurringJob
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(customer_id::text,''), COALESCE(crew_id::text,''), COALESCE(job_id::text,''),
			title, frequency, next_occurrence, active, notes, created_at
		FROM recurring_jobs WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid).Scan(&rj.ID, &rj.CustomerID, &rj.CrewID, &rj.JobID, &rj.Title, &rj.Frequency, &rj.NextOccurrence, &rj.Active, &rj.Notes, &rj.CreatedAt)
	if err != nil {
		return fiber.NewError(404, "recurring job not found")
	}
	return c.JSON(rj)
}

func (p *Plugin) updateRecurringJob(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Title          *string `json:"title"`
		Frequency      *string `json:"frequency"`
		Active         *bool   `json:"active"`
		Notes          *string `json:"notes"`
		CrewID         *string `json:"crew_id"`
		JobID          *string `json:"job_id"`
		NextOccurrence *string `json:"next_occurrence"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	var nextOcc *time.Time
	if body.NextOccurrence != nil && *body.NextOccurrence != "" {
		if t, err := time.Parse(time.RFC3339, *body.NextOccurrence); err == nil {
			nextOcc = &t
		}
	}
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE recurring_jobs SET
			title = COALESCE($3, title),
			frequency = COALESCE($4, frequency),
			active = COALESCE($5, active),
			notes = COALESCE($6, notes),
			crew_id = COALESCE(NULLIF($7,'')::uuid, crew_id),
			job_id = COALESCE(NULLIF($8,'')::uuid, job_id),
			next_occurrence = COALESCE($9, next_occurrence),
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, c.Params("id"), tid, body.Title, body.Frequency, body.Active, body.Notes, body.CrewID, body.JobID, nextOcc)
	if err != nil || tag.RowsAffected() == 0 {
		return fiber.NewError(404, "recurring job not found")
	}
	return p.getRecurringJob(c)
}
