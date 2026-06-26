package reports

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TenantMetrics holds tenant-scoped counts from plugin tables.
type TenantMetrics struct {
	Customers        int64
	Jobs             int64
	ActiveJobs       int64
	JobsToday        int64
	OverdueJobs      int64
	Invoices         int64
	RevenueMTDCents  int64
	ARCents          int64
	AROver30Cents    int64
	AROverdueCount   int64
	ARBuckets        []arBucket
	PendingExpenses  int64
	PendingExpCents  int64
	CrewsActive      int64
	CrewsTotal       int64
	AssignmentsRoute int64
	Board            []boardColumn
}

type arBucket struct {
	Bucket string
	Cents  int64
	Count  int64
}

type boardColumn struct {
	Status string
	Count  int64
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) LoadMetrics(ctx context.Context, tenantID string) (TenantMetrics, error) {
	var m TenantMetrics
	if tenantID == "" {
		return m, errors.New("tenant_id required")
	}

	var err error
	m.Customers, err = s.scalar(ctx, `SELECT COUNT(*)::bigint FROM customers WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return m, fmt.Errorf("customers count: %w", err)
	}
	m.Jobs, err = s.scalar(ctx, `SELECT COUNT(*)::bigint FROM jobs WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return m, fmt.Errorf("jobs count: %w", err)
	}
	m.ActiveJobs, err = s.scalar(ctx, `
		SELECT COUNT(*)::bigint FROM jobs
		WHERE tenant_id = $1 AND status != 'completed'`, tenantID)
	if err != nil {
		return m, fmt.Errorf("active jobs count: %w", err)
	}
	m.JobsToday, err = s.scalar(ctx, `
		SELECT COUNT(*)::bigint FROM jobs
		WHERE tenant_id = $1 AND scheduled_at::date = CURRENT_DATE`, tenantID)
	if err != nil {
		return m, fmt.Errorf("jobs today count: %w", err)
	}
	m.OverdueJobs, err = s.scalar(ctx, `
		SELECT COUNT(*)::bigint FROM jobs
		WHERE tenant_id = $1 AND status != 'completed'
		  AND scheduled_at IS NOT NULL AND scheduled_at < NOW()`, tenantID)
	if err != nil {
		return m, fmt.Errorf("overdue jobs count: %w", err)
	}
	m.Invoices, err = s.scalar(ctx, `SELECT COUNT(*)::bigint FROM invoices WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return m, fmt.Errorf("invoices count: %w", err)
	}
	m.RevenueMTDCents, err = s.scalar(ctx, `
		SELECT COALESCE(SUM(total_cents), 0)::bigint FROM invoices
		WHERE tenant_id = $1 AND status = 'paid'
		  AND paid_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`, tenantID)
	if err != nil {
		return m, fmt.Errorf("revenue mtd: %w", err)
	}

	m.ARCents, err = s.scalar(ctx, `
		SELECT COALESCE(SUM(total_cents), 0)::bigint FROM invoices
		WHERE tenant_id = $1 AND status IN ('sent', 'overdue')`, tenantID)
	if err != nil {
		return m, fmt.Errorf("ar total: %w", err)
	}
	m.AROver30Cents, err = s.scalar(ctx, `
		SELECT COALESCE(SUM(total_cents), 0)::bigint FROM invoices
		WHERE tenant_id = $1 AND status IN ('sent', 'overdue')
		  AND due_at IS NOT NULL AND due_at < NOW() - INTERVAL '30 days'`, tenantID)
	if err != nil {
		return m, fmt.Errorf("ar over 30: %w", err)
	}
	m.AROverdueCount, err = s.scalar(ctx, `
		SELECT COUNT(*)::bigint FROM invoices
		WHERE tenant_id = $1 AND status IN ('sent', 'overdue')
		  AND due_at IS NOT NULL AND due_at < NOW()`, tenantID)
	if err != nil {
		return m, fmt.Errorf("ar overdue count: %w", err)
	}

	m.ARBuckets, err = s.loadARBuckets(ctx, tenantID)
	if err != nil {
		return m, fmt.Errorf("ar buckets: %w", err)
	}

	m.PendingExpenses, err = s.scalar(ctx, `
		SELECT COUNT(*)::bigint FROM expenses
		WHERE tenant_id = $1 AND status = 'pending'`, tenantID)
	if err != nil {
		return m, fmt.Errorf("pending expenses count: %w", err)
	}
	m.PendingExpCents, err = s.scalar(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0)::bigint FROM expenses
		WHERE tenant_id = $1 AND status = 'pending'`, tenantID)
	if err != nil {
		return m, fmt.Errorf("pending expenses total: %w", err)
	}

	m.CrewsActive, err = s.scalar(ctx, `
		SELECT COUNT(*)::bigint FROM crews
		WHERE tenant_id = $1 AND status = 'active'`, tenantID)
	if err != nil {
		return m, fmt.Errorf("active crews: %w", err)
	}
	m.CrewsTotal, err = s.scalar(ctx, `
		SELECT COUNT(*)::bigint FROM crews WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return m, fmt.Errorf("crews total: %w", err)
	}
	m.AssignmentsRoute, err = s.scalar(ctx, `
		SELECT COUNT(*)::bigint FROM work_order_assignments
		WHERE tenant_id = $1 AND status IN ('en_route', 'on_route')`, tenantID)
	if err != nil {
		return m, fmt.Errorf("assignments on route: %w", err)
	}

	m.Board, err = s.loadBoard(ctx, tenantID)
	if err != nil {
		return m, fmt.Errorf("dispatch board: %w", err)
	}

	return m, nil
}

func (m TenantMetrics) HasLiveData() bool {
	return m.Customers > 0 || m.Jobs > 0 || m.Invoices > 0
}

func (s *Service) scalar(ctx context.Context, query, tenantID string) (int64, error) {
	var n int64
	err := s.pool.QueryRow(ctx, query, tenantID).Scan(&n)
	if err != nil {
		if isMissingRelation(err) {
			return 0, nil
		}
		return 0, err
	}
	return n, nil
}

func (s *Service) loadARBuckets(ctx context.Context, tenantID string) ([]arBucket, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT
			CASE
				WHEN due_at IS NULL OR due_at >= NOW() THEN 'current'
				WHEN due_at >= NOW() - INTERVAL '30 days' THEN '30'
				WHEN due_at >= NOW() - INTERVAL '60 days' THEN '60'
				ELSE '90+'
			END AS bucket,
			COALESCE(SUM(total_cents), 0)::bigint AS amount_cents,
			COUNT(*)::bigint AS invoice_count
		FROM invoices
		WHERE tenant_id = $1 AND status IN ('sent', 'overdue')
		GROUP BY 1
		ORDER BY 1`, tenantID)
	if err != nil {
		if isMissingRelation(err) {
			return nil, nil
		}
		return nil, err
	}
	defer rows.Close()

	buckets := make([]arBucket, 0, 4)
	for rows.Next() {
		var b arBucket
		if err := rows.Scan(&b.Bucket, &b.Cents, &b.Count); err != nil {
			return nil, err
		}
		buckets = append(buckets, b)
	}
	return buckets, rows.Err()
}

func (s *Service) loadBoard(ctx context.Context, tenantID string) ([]boardColumn, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT status, COUNT(*)::bigint
		FROM work_orders
		WHERE tenant_id = $1
		GROUP BY status
		ORDER BY status`, tenantID)
	if err != nil {
		if isMissingRelation(err) {
			return s.loadJobBoard(ctx, tenantID)
		}
		return nil, err
	}
	defer rows.Close()

	cols := make([]boardColumn, 0)
	for rows.Next() {
		var col boardColumn
		if err := rows.Scan(&col.Status, &col.Count); err != nil {
			return nil, err
		}
		cols = append(cols, col)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(cols) > 0 {
		return cols, nil
	}
	return s.loadJobBoard(ctx, tenantID)
}

func (s *Service) loadJobBoard(ctx context.Context, tenantID string) ([]boardColumn, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT status, COUNT(*)::bigint
		FROM jobs
		WHERE tenant_id = $1 AND status != 'completed'
		GROUP BY status
		ORDER BY status`, tenantID)
	if err != nil {
		if isMissingRelation(err) {
			return nil, nil
		}
		return nil, err
	}
	defer rows.Close()

	cols := make([]boardColumn, 0)
	for rows.Next() {
		var col boardColumn
		if err := rows.Scan(&col.Status, &col.Count); err != nil {
			return nil, err
		}
		cols = append(cols, col)
	}
	return cols, rows.Err()
}

func isMissingRelation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "42P01"
	}
	return false
}

func (s *Service) LoadPendingExpenses(ctx context.Context, tenantID string, limit int) ([]pendingExpenseItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, description, amount_cents, category, created_at
		FROM expenses
		WHERE tenant_id = $1 AND status = 'pending'
		ORDER BY created_at DESC
		LIMIT $2`, tenantID, limit)
	if err != nil {
		if isMissingRelation(err) {
			return nil, nil
		}
		return nil, err
	}
	defer rows.Close()

	items := make([]pendingExpenseItem, 0)
	for rows.Next() {
		var item pendingExpenseItem
		var cents int64
		var createdAt time.Time
		if err := rows.Scan(&item.ID, &item.Description, &cents, &item.Category, &createdAt); err != nil {
			return nil, err
		}
		item.Amount = formatCents(cents)
		item.SubmittedAt = createdAt.UTC().Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

type pendingExpenseItem struct {
	ID          string
	Description string
	Amount      string
	Category    string
	SubmittedAt string
}
