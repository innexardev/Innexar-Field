/** Maps plugin nav paths to navItems.* message keys (manifest labels stay English for API fallback). */
export const NAV_ITEM_PATH_KEYS: Record<string, string> = {
  "/customers": "customers",
  "/leads": "leads",
  "/contracts": "contracts",
  "/estimates": "estimates",
  "/price-book": "priceBook",
  "/takeoff": "takeoff",
  "/jobs": "jobs",
  "/schedule": "schedule",
  "/schedule/map": "scheduleMap",
  "/crews": "crews",
  "/routes": "routes",
  "/recurring": "recurring",
  "/work-orders": "workOrders",
  "/dispatch": "dispatchBoard",
  "/cleaning/jobs": "todaysCleans",
  "/cleaning/qc": "qualityReview",
  "/cleaning/supplies": "supplies",
  "/recurring-cleans": "recurringCleans",
  "/clean-phases": "cleanPhases",
  "/invoices": "invoices",
  "/payments": "payments",
  "/accounting/chart": "chartOfAccounts",
  "/accounting/ap": "accountsPayable",
  "/accounting/ar": "accountsReceivable",
  "/purchase-orders": "purchaseOrders",
  "/expenses": "expenses",
  "/job-costing": "jobCosting",
  "/payroll": "payroll",
  "/payroll/runs": "payrollRuns",
  "/payroll/tax": "taxWithholding",
  "/timesheets": "timesheets",
  "/projects": "projects",
  "/change-orders": "changeOrders",
  "/milestones": "milestones",
  "/subcontractors": "subcontractors",
  "/permits": "permits",
  "/lien-waivers": "lienWaivers",
  "/rfis": "rfis",
};

export function translateNavItemLabel(
  path: string,
  fallbackLabel: string,
  translate: (key: string) => string,
): string {
  const key = NAV_ITEM_PATH_KEYS[path];
  return key ? translate(key) : fallbackLabel;
}

export function translateNavItems<T extends { label: string; path: string }>(
  items: T[],
  translate: (key: string) => string,
): T[] {
  return items.map((item) => ({
    ...item,
    label: translateNavItemLabel(item.path, item.label, translate),
  }));
}
