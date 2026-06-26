package payroll

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/middleware"
	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Plugin struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Plugin {
	return &Plugin{pool: pool}
}

func (p *Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:            "payroll",
		Name:          "Payroll",
		Version:       "1.0.0",
		Dependencies:  []string{"scheduling"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"payroll.read", "payroll.write"},
		Nav: []plugin.NavItem{
			{Label: "Payroll", Path: "/payroll", Icon: "users"},
			{Label: "Payroll Runs", Path: "/payroll/runs", Icon: "wallet"},
			{Label: "Tax Withholding", Path: "/payroll/tax", Icon: "file-text"},
			{Label: "Timesheets", Path: "/timesheets", Icon: "clock"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/employees", p.listEmployees)
	router.Get("/employees/me", p.getMyEmployee)
	router.Post("/employees", p.createEmployee)
	router.Patch("/employees/:id", p.updateEmployee)
	router.Get("/timesheets", p.listTimesheets)
	router.Post("/timesheets", p.createTimesheet)
	router.Post("/timesheets/:id/submit", p.submitTimesheet)
	router.Post("/timesheets/:id/approve", middleware.RequireRole("admin"), p.approveTimesheet)
	router.Get("/runs", p.listPayrollRuns)
	router.Post("/runs", p.createPayrollRun)
	router.Post("/runs/:id/submit", p.submitPayrollRun)
	router.Get("/tax-profiles", p.listTaxProfiles)
	router.Post("/tax-profiles", p.upsertTaxProfile)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 200, Name: "payroll", UpSQL: payrollSQL},
		{Version: 201, Name: "employees_user_id", UpSQL: employeesUserIDSQL},
	}
}

const employeesUserIDSQL = `
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_tenant_user ON employees (tenant_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees (tenant_id, user_id) WHERE user_id IS NOT NULL;
`

const payrollSQL = `
CREATE TABLE IF NOT EXISTS employees (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	first_name TEXT NOT NULL DEFAULT '',
	last_name TEXT NOT NULL DEFAULT '',
	email TEXT NOT NULL DEFAULT '',
	employment_type TEXT NOT NULL DEFAULT 'w2',
	hourly_rate_cents BIGINT NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'active',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees (tenant_id);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employees_tenant ON employees;
CREATE POLICY employees_tenant ON employees
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS timesheets (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	employee_id UUID NOT NULL,
	job_id UUID,
	work_date DATE NOT NULL DEFAULT CURRENT_DATE,
	hours NUMERIC(6,2) NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'draft',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timesheets_tenant ON timesheets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_job ON timesheets (tenant_id, job_id);
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timesheets_tenant ON timesheets;
CREATE POLICY timesheets_tenant ON timesheets
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS payroll_runs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	pay_period_start DATE NOT NULL,
	pay_period_end DATE NOT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	total_gross_cents BIGINT NOT NULL DEFAULT 0,
	employee_count INT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant ON payroll_runs (tenant_id);
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_runs_tenant ON payroll_runs;
CREATE POLICY payroll_runs_tenant ON payroll_runs
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS payroll_tax_profiles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	employee_id UUID NOT NULL,
	filing_status TEXT NOT NULL DEFAULT 'single',
	allowances INT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payroll_tax_profiles_tenant ON payroll_tax_profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_tax_profiles_employee ON payroll_tax_profiles (tenant_id, employee_id);
ALTER TABLE payroll_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_tax_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_tax_profiles_tenant ON payroll_tax_profiles;
CREATE POLICY payroll_tax_profiles_tenant ON payroll_tax_profiles
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type Employee struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id,omitempty"`
	FirstName       string    `json:"first_name"`
	LastName        string    `json:"last_name"`
	Email           string    `json:"email"`
	EmploymentType  string    `json:"employment_type"`
	HourlyRateCents int64     `json:"hourly_rate_cents"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Timesheet struct {
	ID         string    `json:"id"`
	EmployeeID string    `json:"employee_id"`
	JobID      string    `json:"job_id,omitempty"`
	WorkDate   string    `json:"work_date"`
	Hours      float64   `json:"hours"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type TaxProfile struct {
	ID            string    `json:"id"`
	EmployeeID    string    `json:"employee_id"`
	FilingStatus  string    `json:"filing_status"`
	Allowances    int       `json:"allowances"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type PayrollRun struct {
	ID               string    `json:"id"`
	PayPeriodStart   string    `json:"pay_period_start"`
	PayPeriodEnd     string    `json:"pay_period_end"`
	Status           string    `json:"status"`
	TotalGrossCents  int64     `json:"total_gross_cents"`
	EmployeeCount    int       `json:"employee_count"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (p *Plugin) listEmployees(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, COALESCE(user_id::text, ''), first_name, last_name, email, employment_type, hourly_rate_cents, status, created_at, updated_at
		FROM employees WHERE tenant_id = $1
		ORDER BY last_name, first_name, created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list employees")
	}
	defer rows.Close()

	var list []Employee
	for rows.Next() {
		var item Employee
		if err := rows.Scan(&item.ID, &item.UserID, &item.FirstName, &item.LastName, &item.Email, &item.EmploymentType, &item.HourlyRateCents, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return err
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}

var validEmploymentTypes = map[string]bool{
	"w2":   true,
	"1099": true,
}

func (p *Plugin) createEmployee(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		FirstName       string `json:"first_name"`
		LastName        string `json:"last_name"`
		Email           string `json:"email"`
		EmploymentType  string `json:"employment_type"`
		HourlyRateCents int64  `json:"hourly_rate_cents"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.FirstName == "" || body.LastName == "" {
		return fiber.NewError(400, "first_name and last_name required")
	}
	if body.EmploymentType == "" {
		body.EmploymentType = "w2"
	}
	if !validEmploymentTypes[body.EmploymentType] {
		return fiber.NewError(400, "invalid employment_type")
	}
	if body.HourlyRateCents < 0 {
		return fiber.NewError(400, "hourly_rate_cents must be non-negative")
	}

	id := uuid.New().String()
	var createdAt, updatedAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO employees (id, tenant_id, first_name, last_name, email, employment_type, hourly_rate_cents, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
		RETURNING created_at, updated_at
	`, id, tid, body.FirstName, body.LastName, body.Email, body.EmploymentType, body.HourlyRateCents).Scan(&createdAt, &updatedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create employee")
	}
	return c.Status(201).JSON(Employee{
		ID:              id,
		FirstName:       body.FirstName,
		LastName:        body.LastName,
		Email:           body.Email,
		EmploymentType:  body.EmploymentType,
		HourlyRateCents: body.HourlyRateCents,
		Status:          "active",
		CreatedAt:       createdAt,
		UpdatedAt:       updatedAt,
	})
}

func (p *Plugin) getMyEmployee(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	uid, ok := tenant.UserID(c.UserContext())
	if !ok {
		return fiber.NewError(401, "authentication required")
	}

	var item Employee
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(user_id::text, ''), first_name, last_name, email, employment_type, hourly_rate_cents, status, created_at, updated_at
		FROM employees WHERE tenant_id = $1 AND user_id = $2
	`, tid, uid).Scan(
		&item.ID, &item.UserID, &item.FirstName, &item.LastName, &item.Email,
		&item.EmploymentType, &item.HourlyRateCents, &item.Status, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return fiber.NewError(404, "no employee profile linked to this user")
	}
	return c.JSON(item)
}

func (p *Plugin) updateEmployee(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")

	var body struct {
		UserID *string `json:"user_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.UserID == nil {
		return fiber.NewError(400, "user_id required in body (use null to unlink)")
	}

	if *body.UserID != "" {
		var userExists bool
		err := p.pool.QueryRow(c.UserContext(), `
			SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND tenant_id = $2)
		`, *body.UserID, tid).Scan(&userExists)
		if err != nil || !userExists {
			return fiber.NewError(400, "user not found in workspace")
		}

		var alreadyLinked bool
		err = p.pool.QueryRow(c.UserContext(), `
			SELECT EXISTS(
				SELECT 1 FROM employees WHERE tenant_id = $1 AND user_id = $2::uuid AND id != $3::uuid
			)
		`, tid, *body.UserID, id).Scan(&alreadyLinked)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to validate user link")
		}
		if alreadyLinked {
			return fiber.NewError(409, "user already linked to another employee")
		}
	}

	var item Employee
	err := p.pool.QueryRow(c.UserContext(), `
		UPDATE employees SET user_id = NULLIF($3, '')::uuid, updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, COALESCE(user_id::text, ''), first_name, last_name, email, employment_type, hourly_rate_cents, status, created_at, updated_at
	`, id, tid, *body.UserID).Scan(
		&item.ID, &item.UserID, &item.FirstName, &item.LastName, &item.Email,
		&item.EmploymentType, &item.HourlyRateCents, &item.Status, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return fiber.NewError(404, "employee not found")
	}
	return c.JSON(item)
}

func (p *Plugin) createTimesheet(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		Action     string  `json:"action"`
		JobID      string  `json:"job_id"`
		Latitude   float64 `json:"latitude"`
		Longitude  float64 `json:"longitude"`
		RecordedAt string  `json:"recorded_at"`
		Hours      float64 `json:"hours"`
		WorkDate   string  `json:"work_date"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(400, "invalid body")
	}
	if body.Action != "clock_in" && body.Action != "clock_out" && body.Hours <= 0 {
		return fiber.NewError(400, "action or hours required")
	}
	workDate := body.WorkDate
	if workDate == "" {
		workDate = time.Now().Format("2006-01-02")
	}
	status := "draft"
	if body.Action == "clock_in" {
		status = "open"
	} else if body.Action == "clock_out" {
		status = "submitted"
	}

	uid, ok := tenant.UserID(c.UserContext())
	if !ok {
		return fiber.NewError(401, "authentication required")
	}

	var employeeID string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT id FROM employees WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'
	`, tid, uid).Scan(&employeeID)
	if err != nil {
		return fiber.NewError(400, "no active employee profile linked to this user")
	}

	id := uuid.New().String()
	var createdAt, updatedAt time.Time
	err = p.pool.QueryRow(c.UserContext(), `
		INSERT INTO timesheets (id, tenant_id, employee_id, job_id, work_date, hours, status)
		VALUES ($1, $2, $3, NULLIF($4,'')::uuid, $5::date, $6, $7)
		RETURNING created_at, updated_at
	`, id, tid, employeeID, body.JobID, workDate, body.Hours, status).Scan(&createdAt, &updatedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create timesheet")
	}
	return c.Status(201).JSON(Timesheet{
		ID:         id,
		EmployeeID: employeeID,
		JobID:      body.JobID,
		WorkDate:   workDate,
		Hours:      body.Hours,
		Status:     status,
		CreatedAt:  createdAt,
		UpdatedAt:  updatedAt,
	})
}

func (p *Plugin) listTimesheets(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, employee_id::text, COALESCE(job_id::text,''), work_date::text, hours, status, created_at, updated_at
		FROM timesheets WHERE tenant_id = $1
		ORDER BY work_date DESC, created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list timesheets")
	}
	defer rows.Close()

	var list []Timesheet
	for rows.Next() {
		var item Timesheet
		if err := rows.Scan(&item.ID, &item.EmployeeID, &item.JobID, &item.WorkDate, &item.Hours, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return err
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}

func (p *Plugin) listPayrollRuns(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, pay_period_start::text, pay_period_end::text, status, total_gross_cents, employee_count, created_at, updated_at
		FROM payroll_runs WHERE tenant_id = $1
		ORDER BY pay_period_end DESC, created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list payroll runs")
	}
	defer rows.Close()

	var list []PayrollRun
	for rows.Next() {
		var item PayrollRun
		if err := rows.Scan(&item.ID, &item.PayPeriodStart, &item.PayPeriodEnd, &item.Status, &item.TotalGrossCents, &item.EmployeeCount, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return err
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}

func (p *Plugin) submitTimesheet(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")

	var item Timesheet
	err := p.pool.QueryRow(c.UserContext(), `
		UPDATE timesheets SET status = 'submitted', updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status IN ('draft', 'open')
		RETURNING id, employee_id::text, COALESCE(job_id::text,''), work_date::text, hours, status, created_at, updated_at
	`, id, tid).Scan(&item.ID, &item.EmployeeID, &item.JobID, &item.WorkDate, &item.Hours, &item.Status, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return fiber.NewError(404, "timesheet not found or not submittable")
	}
	return c.JSON(item)
}

func (p *Plugin) approveTimesheet(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	id := c.Params("id")

	var item Timesheet
	err := p.pool.QueryRow(c.UserContext(), `
		UPDATE timesheets SET status = 'approved', updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'submitted'
		RETURNING id, employee_id::text, COALESCE(job_id::text,''), work_date::text, hours, status, created_at, updated_at
	`, id, tid).Scan(&item.ID, &item.EmployeeID, &item.JobID, &item.WorkDate, &item.Hours, &item.Status, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return fiber.NewError(404, "timesheet not found or not approvable")
	}
	return c.JSON(item)
}

func (p *Plugin) createPayrollRun(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		PayPeriodStart string `json:"pay_period_start"`
		PayPeriodEnd   string `json:"pay_period_end"`
	}
	if err := c.BodyParser(&body); err != nil || body.PayPeriodStart == "" || body.PayPeriodEnd == "" {
		return fiber.NewError(400, "pay_period_start and pay_period_end required")
	}

	id := uuid.New().String()
	var createdAt, updatedAt time.Time
	err := p.pool.QueryRow(c.UserContext(), `
		INSERT INTO payroll_runs (id, tenant_id, pay_period_start, pay_period_end, status)
		VALUES ($1, $2, $3::date, $4::date, 'draft')
		RETURNING created_at, updated_at
	`, id, tid, body.PayPeriodStart, body.PayPeriodEnd).Scan(&createdAt, &updatedAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create payroll run")
	}
	return c.Status(201).JSON(PayrollRun{
		ID:             id,
		PayPeriodStart: body.PayPeriodStart,
		PayPeriodEnd:   body.PayPeriodEnd,
		Status:         "draft",
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	})
}

func (p *Plugin) submitPayrollRun(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	runID := c.Params("id")

	var payPeriodStart, payPeriodEnd string
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT pay_period_start::text, pay_period_end::text
		FROM payroll_runs WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
	`, runID, tid).Scan(&payPeriodStart, &payPeriodEnd)
	if err != nil {
		return fiber.NewError(404, "payroll run not found or not submittable")
	}

	var employeeCount int
	var totalGrossCents int64
	err = p.pool.QueryRow(c.UserContext(), `
		SELECT COUNT(DISTINCT t.employee_id),
			COALESCE(SUM((t.hours * e.hourly_rate_cents)::bigint), 0)
		FROM timesheets t
		JOIN employees e ON e.id = t.employee_id AND e.tenant_id = t.tenant_id
		WHERE t.tenant_id = $1 AND t.status = 'approved'
		  AND t.work_date >= $2::date AND t.work_date <= $3::date
	`, tid, payPeriodStart, payPeriodEnd).Scan(&employeeCount, &totalGrossCents)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to calculate payroll run")
	}

	var item PayrollRun
	var createdAt, updatedAt time.Time
	err = p.pool.QueryRow(c.UserContext(), `
		UPDATE payroll_runs
		SET status = 'processing', total_gross_cents = $3, employee_count = $4, updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
		RETURNING id, pay_period_start::text, pay_period_end::text, status, total_gross_cents, employee_count, created_at, updated_at
	`, runID, tid, totalGrossCents, employeeCount).Scan(
		&item.ID, &item.PayPeriodStart, &item.PayPeriodEnd, &item.Status,
		&item.TotalGrossCents, &item.EmployeeCount, &createdAt, &updatedAt,
	)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to submit payroll run")
	}
	item.CreatedAt = createdAt
	item.UpdatedAt = updatedAt
	return c.JSON(item)
}

var validFilingStatuses = map[string]bool{
	"single":                   true,
	"married_filing_jointly":     true,
	"married_filing_separately": true,
	"head_of_household":        true,
}

func (p *Plugin) upsertTaxProfile(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	var body struct {
		EmployeeID   string `json:"employee_id"`
		FilingStatus string `json:"filing_status"`
		Allowances   int    `json:"allowances"`
	}
	if err := c.BodyParser(&body); err != nil || body.EmployeeID == "" {
		return fiber.NewError(400, "employee_id required")
	}
	if body.FilingStatus == "" {
		body.FilingStatus = "single"
	}
	if !validFilingStatuses[body.FilingStatus] {
		return fiber.NewError(400, "invalid filing_status")
	}
	if body.Allowances < 0 {
		return fiber.NewError(400, "allowances must be non-negative")
	}

	var exists bool
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT EXISTS(SELECT 1 FROM employees WHERE id = $1 AND tenant_id = $2)
	`, body.EmployeeID, tid).Scan(&exists)
	if err != nil || !exists {
		return fiber.NewError(400, "employee not found")
	}

	var item TaxProfile
	var createdAt, updatedAt time.Time
	tag, err := p.pool.Exec(c.UserContext(), `
		UPDATE payroll_tax_profiles
		SET filing_status = $3, allowances = $4, updated_at = NOW()
		WHERE tenant_id = $1 AND employee_id = $2
	`, tid, body.EmployeeID, body.FilingStatus, body.Allowances)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to save tax profile")
	}
	created := tag.RowsAffected() == 0
	if created {
		id := uuid.New().String()
		err = p.pool.QueryRow(c.UserContext(), `
			INSERT INTO payroll_tax_profiles (id, tenant_id, employee_id, filing_status, allowances)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, employee_id::text, filing_status, allowances, created_at, updated_at
		`, id, tid, body.EmployeeID, body.FilingStatus, body.Allowances).Scan(
			&item.ID, &item.EmployeeID, &item.FilingStatus, &item.Allowances, &createdAt, &updatedAt,
		)
	} else {
		err = p.pool.QueryRow(c.UserContext(), `
			SELECT id, employee_id::text, filing_status, allowances, created_at, updated_at
			FROM payroll_tax_profiles WHERE tenant_id = $1 AND employee_id = $2
		`, tid, body.EmployeeID).Scan(&item.ID, &item.EmployeeID, &item.FilingStatus, &item.Allowances, &createdAt, &updatedAt)
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to save tax profile")
	}
	item.CreatedAt = createdAt
	item.UpdatedAt = updatedAt
	if created {
		return c.Status(fiber.StatusCreated).JSON(item)
	}
	return c.JSON(item)
}

func (p *Plugin) listTaxProfiles(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, employee_id::text, filing_status, allowances, created_at, updated_at
		FROM payroll_tax_profiles WHERE tenant_id = $1
		ORDER BY created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list tax profiles")
	}
	defer rows.Close()

	var list []TaxProfile
	for rows.Next() {
		var item TaxProfile
		if err := rows.Scan(&item.ID, &item.EmployeeID, &item.FilingStatus, &item.Allowances, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return err
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}
