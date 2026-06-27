/** Core modules are always provisioned and cannot be toggled off during onboarding. */
export const CORE_MODULES = ["crm", "estimating", "scheduling", "invoicing"] as const;

export const MODULE_META: Record<
  string,
  { label: string; description: string; core?: boolean }
> = {
  crm: { label: "CRM", description: "Customers, leads, and contact management", core: true },
  estimating: { label: "Estimating", description: "Quotes, proposals, and price books", core: true },
  scheduling: { label: "Scheduling", description: "Jobs, crews, and calendar", core: true },
  invoicing: { label: "Invoicing", description: "Billing, payments, and receivables", core: true },
  cleaning: { label: "Cleaning", description: "Recurring cleans, phases, and checklists" },
  construction: { label: "Construction", description: "Projects, milestones, and change orders" },
  "job-costing": { label: "Job costing", description: "Budgets, margins, and cost tracking" },
  dispatch: { label: "Dispatch", description: "Work orders, routing, and field crews" },
  expenses: { label: "Expenses", description: "Receipts, reimbursements, and job expenses" },
  payroll: { label: "Payroll", description: "Runs, tax withholding, and timesheets" },
  accounting: { label: "Accounting", description: "GL, AP/AR, and chart of accounts" },
  "client-portal": { label: "Client portal", description: "Customer self-service and approvals" },
};

export function defaultModulesForPacks(packModules: string[][]): Record<string, boolean> {
  const ids = new Set<string>(CORE_MODULES);
  for (const mods of packModules) {
    for (const m of mods) ids.add(m);
  }
  const out: Record<string, boolean> = {};
  for (const id of ids) out[id] = true;
  return out;
}

export function resolveModulesFromPacks(
  packs: { id: string; modules: string[] }[],
  selectedIds: string[],
): Record<string, boolean> {
  const selected = packs.filter((p) => selectedIds.includes(p.id));
  return defaultModulesForPacks(selected.map((p) => p.modules));
}
