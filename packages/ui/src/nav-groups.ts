export type ShellNavItem = {
  label: string;
  path: string;
  icon?: string;
  plugin_id?: string;
};

const PLUGIN_GROUP: Record<string, string> = {
  crm: "Sales",
  estimating: "Sales",
  scheduling: "Operations",
  dispatch: "Operations",
  cleaning: "Operations",
  construction: "Operations",
  invoicing: "Finance",
  accounting: "Finance",
  expenses: "Finance",
  "job-costing": "Finance",
  payroll: "Workforce",
};

const GROUP_ORDER = ["Sales", "Operations", "Finance", "Workforce", "Other"] as const;

export type NavGroup = {
  label: string;
  items: ShellNavItem[];
};

export function groupNavItems(nav: ShellNavItem[] | null | undefined): NavGroup[] {
  const safe = nav ?? [];
  const buckets = new Map<string, ShellNavItem[]>();

  for (const item of safe) {
    const group = (item.plugin_id && PLUGIN_GROUP[item.plugin_id]) || "Other";
    const list = buckets.get(group) ?? [];
    list.push(item);
    buckets.set(group, list);
  }

  const groups: NavGroup[] = [];
  for (const label of GROUP_ORDER) {
    const items = buckets.get(label);
    if (items?.length) groups.push({ label, items });
    buckets.delete(label);
  }
  for (const [label, items] of buckets) {
    if (items.length) groups.push({ label, items });
  }
  return groups;
}
