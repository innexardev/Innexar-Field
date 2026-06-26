package reports

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

func stubKpis() []fiber.Map {
	return []fiber.Map{
		{"id": "revenue-mtd", "label": "Revenue (MTD)", "value": "$42,800", "delta": "+12%", "category": "financial"},
		{"id": "gross-margin", "label": "Gross margin", "value": "38%", "delta": "+2.1 pts", "category": "financial"},
		{"id": "cash-flow", "label": "Cash flow (30d)", "value": "$18,200", "delta": "Net positive", "category": "financial"},
		{"id": "wip", "label": "Work in progress", "value": "$64,500", "delta": "7 active jobs", "category": "operations"},
		{"id": "ar-aging", "label": "AR over 30 days", "value": "$8,450", "delta": "3 invoices", "category": "financial"},
		{"id": "utilization", "label": "Crew utilization", "value": "82%", "delta": "This week", "category": "operations"},
	}
}

func liveKpis(m TenantMetrics) []fiber.Map {
	activeLabel := "No active jobs"
	if m.ActiveJobs == 1 {
		activeLabel = "1 active job"
	} else if m.ActiveJobs > 1 {
		activeLabel = formatCount(m.ActiveJobs) + " active jobs"
	}

	arDelta := "No overdue invoices"
	if m.AROverdueCount == 1 {
		arDelta = "1 invoice"
	} else if m.AROverdueCount > 1 {
		arDelta = formatCount(m.AROverdueCount) + " invoices"
	}

	return []fiber.Map{
		{"id": "revenue-mtd", "label": "Revenue (MTD)", "value": formatCents(m.RevenueMTDCents), "delta": "Paid invoices", "category": "financial"},
		{"id": "customers", "label": "Customers", "value": formatCount(m.Customers), "delta": "CRM records", "category": "operations"},
		{"id": "active-jobs", "label": "Active jobs", "value": formatCount(m.ActiveJobs), "delta": activeLabel, "category": "operations"},
		{"id": "invoices", "label": "Invoices", "value": formatCount(m.Invoices), "delta": formatCents(m.ARCents) + " outstanding", "category": "financial"},
		{"id": "ar-aging", "label": "AR over 30 days", "value": formatCents(m.AROver30Cents), "delta": arDelta, "category": "financial"},
		{"id": "pending-expenses", "label": "Pending expenses", "value": formatCount(m.PendingExpenses), "delta": formatCents(m.PendingExpCents) + " awaiting approval", "category": "financial"},
	}
}

func stubOwnerDashboard() fiber.Map {
	return fiber.Map{
		"revenue_mtd":   fiber.Map{"value": "$42,800", "delta": "+12%"},
		"gross_margin":  fiber.Map{"value": "38%", "delta": "+2.1 pts"},
		"active_jobs":   fiber.Map{"value": "24", "delta": "6 due today"},
		"revenue_trend": []int{40, 55, 48, 72, 65, 80, 76},
		"top_jobs_by_margin": []fiber.Map{
			{"name": "Oak St remodel", "margin_percent": 42},
			{"name": "Downtown office clean", "margin_percent": 38},
			{"name": "Warehouse HVAC", "margin_percent": 35},
		},
	}
}

func liveOwnerDashboard(m TenantMetrics) fiber.Map {
	todayDelta := "None due today"
	if m.JobsToday == 1 {
		todayDelta = "1 due today"
	} else if m.JobsToday > 1 {
		todayDelta = formatCount(m.JobsToday) + " due today"
	}

	return fiber.Map{
		"revenue_mtd":        fiber.Map{"value": formatCents(m.RevenueMTDCents), "delta": "Paid invoices (MTD)"},
		"gross_margin":       fiber.Map{"value": formatCents(m.ARCents), "delta": "Outstanding AR"},
		"active_jobs":        fiber.Map{"value": formatCount(m.ActiveJobs), "delta": todayDelta},
		"revenue_trend":      []int{40, 55, 48, 72, 65, 80, 76},
		"top_jobs_by_margin": []fiber.Map{},
	}
}

func stubDispatcherDashboard() fiber.Map {
	return fiber.Map{
		"jobs_today":     fiber.Map{"value": "14", "note": "3 unassigned"},
		"overdue":        fiber.Map{"value": "2", "note": "Past SLA"},
		"crew_available": fiber.Map{"value": "5", "note": "of 12 total"},
		"crews_on_route": fiber.Map{"value": "8", "note": "2 running late"},
		"board": []fiber.Map{
			{"status": "unassigned", "count": 3},
			{"status": "en_route", "count": 5},
			{"status": "on_site", "count": 4},
			{"status": "complete", "count": 2},
		},
	}
}

func liveDispatcherDashboard(m TenantMetrics) fiber.Map {
	unassigned := int64(0)
	for _, col := range m.Board {
		if col.Status == "open" || col.Status == "unassigned" || col.Status == "scheduled" {
			unassigned += col.Count
		}
	}

	crewNote := "No crews configured"
	if m.CrewsTotal > 0 {
		crewNote = formatCount(m.CrewsActive) + " of " + formatCount(m.CrewsTotal) + " total"
	}

	board := make([]fiber.Map, 0, len(m.Board))
	for _, col := range m.Board {
		board = append(board, fiber.Map{"status": col.Status, "count": col.Count})
	}

	return fiber.Map{
		"jobs_today":     fiber.Map{"value": formatCount(m.JobsToday), "note": formatCount(unassigned) + " unassigned"},
		"overdue":        fiber.Map{"value": formatCount(m.OverdueJobs), "note": "Past scheduled time"},
		"crew_available": fiber.Map{"value": formatCount(m.CrewsActive), "note": crewNote},
		"crews_on_route": fiber.Map{"value": formatCount(m.AssignmentsRoute), "note": "Active assignments"},
		"board":          board,
	}
}

func stubAccountantDashboard() fiber.Map {
	return fiber.Map{
		"ar_aging": fiber.Map{
			"total":         "$18,450",
			"over_30":       "$8,450",
			"overdue_count": 3,
			"buckets": []fiber.Map{
				{"bucket": "current", "amount": "$9,200", "count": 4},
				{"bucket": "30", "amount": "$5,100", "count": 2},
				{"bucket": "60", "amount": "$2,350", "count": 1},
				{"bucket": "90+", "amount": "$1,800", "count": 1},
			},
		},
		"pending_expenses": fiber.Map{
			"count": 7,
			"total": "$3,240",
			"items": []fiber.Map{
				{"id": "exp-01", "description": "Fuel — Crew Alpha", "amount": "$86.40", "category": "fuel", "submitted_at": time.Now().UTC().Add(-48 * time.Hour).Format(time.RFC3339)},
				{"id": "exp-02", "description": "Materials — Oak St", "amount": "$412.00", "category": "materials", "submitted_at": time.Now().UTC().Add(-24 * time.Hour).Format(time.RFC3339)},
				{"id": "exp-03", "description": "Parking — Downtown clean", "amount": "$18.00", "category": "travel", "submitted_at": time.Now().UTC().Add(-6 * time.Hour).Format(time.RFC3339)},
			},
		},
	}
}

func liveAccountantDashboard(m TenantMetrics, items []pendingExpenseItem) fiber.Map {
	buckets := make([]fiber.Map, 0, len(m.ARBuckets))
	for _, b := range m.ARBuckets {
		buckets = append(buckets, fiber.Map{
			"bucket": b.Bucket,
			"amount": formatCents(b.Cents),
			"count":  b.Count,
		})
	}

	expItems := make([]fiber.Map, 0, len(items))
	for _, item := range items {
		expItems = append(expItems, fiber.Map{
			"id":           item.ID,
			"description":  item.Description,
			"amount":       item.Amount,
			"category":     item.Category,
			"submitted_at": item.SubmittedAt,
		})
	}

	return fiber.Map{
		"ar_aging": fiber.Map{
			"total":         formatCents(m.ARCents),
			"over_30":       formatCents(m.AROver30Cents),
			"overdue_count": m.AROverdueCount,
			"buckets":       buckets,
		},
		"pending_expenses": fiber.Map{
			"count": m.PendingExpenses,
			"total": formatCents(m.PendingExpCents),
			"items": expItems,
		},
	}
}

func stubProfitAndLoss() fiber.Map {
	return fiber.Map{
		"id": "pl", "title": "Profit & Loss",
		"description": "Revenue, COGS, and net income by period",
		"value":       "$12,400", "delta": "Net income (MTD)", "period": "Month to date", "href": "/accounting/chart",
	}
}

func liveProfitAndLoss(m TenantMetrics) fiber.Map {
	return fiber.Map{
		"id": "pl", "title": "Profit & Loss",
		"description": "Revenue from paid invoices this month",
		"value":       formatCents(m.RevenueMTDCents), "delta": formatCount(m.Invoices) + " invoices on file",
		"period": "Month to date", "href": "/accounting/chart",
	}
}

func stubCashFlow() fiber.Map {
	return fiber.Map{
		"id": "cash-flow", "title": "Cash Flow",
		"description": "Operating, investing, and financing cash movement",
		"value":       "$18,200", "delta": "Net positive (30d)", "period": "Last 30 days", "href": "/accounting/ap",
	}
}

func liveCashFlow(m TenantMetrics) fiber.Map {
	return fiber.Map{
		"id": "cash-flow", "title": "Cash Flow",
		"description": "Outstanding receivables from sent invoices",
		"value":       formatCents(m.ARCents), "delta": formatCount(m.AROverdueCount) + " overdue",
		"period": "Open AR", "href": "/accounting/ar",
	}
}

func stubWIP() fiber.Map {
	return fiber.Map{
		"id": "wip", "title": "Work in Progress",
		"description": "Unbilled revenue and cost accumulation on open jobs",
		"value":       "$64,500", "delta": "7 active jobs", "period": "As of today", "href": "/job-costing",
	}
}

func liveWIP(m TenantMetrics) fiber.Map {
	delta := formatCount(m.ActiveJobs) + " active jobs"
	return fiber.Map{
		"id": "wip", "title": "Work in Progress",
		"description": "Open jobs and customer pipeline",
		"value":       formatCount(m.Jobs), "delta": delta,
		"period": "As of today", "href": "/jobs",
	}
}

func formatCount(n int64) string {
	if n < 0 {
		return "0"
	}
	return commaThousands(n)
}
