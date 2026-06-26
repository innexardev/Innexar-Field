package accounting

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/plugin"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
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
		ID:            "accounting",
		Name:          "Accounting",
		Version:       "1.0.0",
		Dependencies:  []string{"invoicing"},
		IndustryPacks: []string{"cleaning", "construction", "field-services"},
		Permissions:   []string{"accounting.read", "accounting.write"},
		Nav: []plugin.NavItem{
			{Label: "Accountant dashboard", Path: "/dashboard/accountant", Icon: "calculator"},
			{Label: "Chart of Accounts", Path: "/accounting/chart", Icon: "chart"},
			{Label: "Accounts Payable", Path: "/accounting/ap", Icon: "receipt"},
			{Label: "Accounts Receivable", Path: "/accounting/ar", Icon: "credit-card"},
			{Label: "Purchase Orders", Path: "/purchase-orders", Icon: "truck"},
		},
	}
}

func (p *Plugin) RegisterRoutes(router fiber.Router, deps plugin.Deps) {
	router.Get("/chart", p.listChartOfAccounts)
	router.Get("/ap", p.listAPBills)
	router.Get("/ar", p.listARAging)
	router.Get("/purchase-orders", p.listPurchaseOrders)
}

func (p *Plugin) Migrations() []plugin.Migration {
	return []plugin.Migration{{Version: 190, Name: "accounting", UpSQL: accountingSQL}}
}

const accountingSQL = `
CREATE TABLE IF NOT EXISTS chart_of_accounts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	account_number TEXT NOT NULL DEFAULT '',
	name TEXT NOT NULL DEFAULT '',
	account_type TEXT NOT NULL DEFAULT 'expense',
	balance_cents BIGINT NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant ON chart_of_accounts (tenant_id);
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chart_of_accounts_tenant ON chart_of_accounts;
CREATE POLICY chart_of_accounts_tenant ON chart_of_accounts
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS ap_bills (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	vendor_name TEXT NOT NULL DEFAULT '',
	bill_number TEXT NOT NULL DEFAULT '',
	amount_cents BIGINT NOT NULL DEFAULT 0,
	due_date DATE,
	status TEXT NOT NULL DEFAULT 'open',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ap_bills_tenant ON ap_bills (tenant_id);
ALTER TABLE ap_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_bills FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ap_bills_tenant ON ap_bills;
CREATE POLICY ap_bills_tenant ON ap_bills
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS ar_aging (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	customer_name TEXT NOT NULL DEFAULT '',
	invoice_number TEXT NOT NULL DEFAULT '',
	amount_cents BIGINT NOT NULL DEFAULT 0,
	days_outstanding INT NOT NULL DEFAULT 0,
	aging_bucket TEXT NOT NULL DEFAULT 'current',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_aging_tenant ON ar_aging (tenant_id);
ALTER TABLE ar_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_aging FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_aging_tenant ON ar_aging;
CREATE POLICY ar_aging_tenant ON ar_aging
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS purchase_orders (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	vendor_name TEXT NOT NULL DEFAULT '',
	po_number TEXT NOT NULL DEFAULT '',
	amount_cents BIGINT NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'draft',
	job_id UUID,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_job ON purchase_orders (tenant_id, job_id);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_orders_tenant ON purchase_orders;
CREATE POLICY purchase_orders_tenant ON purchase_orders
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type ChartOfAccount struct {
	ID            string    `json:"id"`
	AccountNumber string    `json:"account_number"`
	Name          string    `json:"name"`
	AccountType   string    `json:"account_type"`
	BalanceCents  int64     `json:"balance_cents"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type APBill struct {
	ID          string    `json:"id"`
	VendorName  string    `json:"vendor_name"`
	BillNumber  string    `json:"bill_number"`
	AmountCents int64     `json:"amount_cents"`
	DueDate     string    `json:"due_date,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ARAging struct {
	ID              string    `json:"id"`
	CustomerName    string    `json:"customer_name"`
	InvoiceNumber   string    `json:"invoice_number"`
	AmountCents     int64     `json:"amount_cents"`
	DaysOutstanding int       `json:"days_outstanding"`
	AgingBucket     string    `json:"aging_bucket"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type PurchaseOrder struct {
	ID          string    `json:"id"`
	VendorName  string    `json:"vendor_name"`
	PONumber    string    `json:"po_number"`
	AmountCents int64     `json:"amount_cents"`
	Status      string    `json:"status"`
	JobID       string    `json:"job_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (p *Plugin) listChartOfAccounts(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, account_number, name, account_type, balance_cents, is_active, created_at, updated_at
		FROM chart_of_accounts WHERE tenant_id = $1
		ORDER BY account_number, created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list chart of accounts")
	}
	defer rows.Close()

	var list []ChartOfAccount
	for rows.Next() {
		var item ChartOfAccount
		if err := rows.Scan(&item.ID, &item.AccountNumber, &item.Name, &item.AccountType, &item.BalanceCents, &item.IsActive, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return err
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}

func (p *Plugin) listAPBills(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, vendor_name, bill_number, amount_cents, COALESCE(due_date::text,''), status, created_at, updated_at
		FROM ap_bills WHERE tenant_id = $1
		ORDER BY due_date DESC NULLS LAST, created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list AP bills")
	}
	defer rows.Close()

	var list []APBill
	for rows.Next() {
		var item APBill
		if err := rows.Scan(&item.ID, &item.VendorName, &item.BillNumber, &item.AmountCents, &item.DueDate, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return err
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}

func (p *Plugin) listARAging(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, customer_name, invoice_number, amount_cents, days_outstanding, aging_bucket, created_at, updated_at
		FROM ar_aging WHERE tenant_id = $1
		ORDER BY days_outstanding DESC, created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list AR aging")
	}
	defer rows.Close()

	var list []ARAging
	for rows.Next() {
		var item ARAging
		if err := rows.Scan(&item.ID, &item.CustomerName, &item.InvoiceNumber, &item.AmountCents, &item.DaysOutstanding, &item.AgingBucket, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return err
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}

func (p *Plugin) listPurchaseOrders(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, vendor_name, po_number, amount_cents, status, COALESCE(job_id::text,''), created_at, updated_at
		FROM purchase_orders WHERE tenant_id = $1
		ORDER BY created_at DESC LIMIT 100
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list purchase orders")
	}
	defer rows.Close()

	var list []PurchaseOrder
	for rows.Next() {
		var item PurchaseOrder
		if err := rows.Scan(&item.ID, &item.VendorName, &item.PONumber, &item.AmountCents, &item.Status, &item.JobID, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return err
		}
		list = append(list, item)
	}
	return response.DataList(c, list)
}
