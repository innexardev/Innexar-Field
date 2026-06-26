#!/usr/bin/env node
/**
 * Patches module list pages to use useTranslations for title/subtitle/empty states.
 * Run: node scripts/i18n-patch-list-pages.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const WEB = join(import.meta.dirname, "../apps/web/app");

/** app-relative path -> modules.* namespace */
const PAGES = {
  "schedule/map/page.tsx": "scheduleMap",
  "routes/page.tsx": "routes",
  "projects/page.tsx": "projects",
  "subcontractors/page.tsx": "subcontractors",
  "rfis/page.tsx": "rfis",
  "accounting/ap/page.tsx": "accountsPayable",
  "accounting/ar/page.tsx": "accountsReceivable",
  "accounting/chart/page.tsx": "chartOfAccounts",
  "contracts/page.tsx": "contracts",
  "purchase-orders/page.tsx": "purchaseOrders",
  "crews/page.tsx": "crews",
  "payroll/runs/page.tsx": "payrollRuns",
  "payroll/tax/page.tsx": "payrollTax",
  "permits/page.tsx": "permits",
  "change-orders/page.tsx": "changeOrders",
  "timesheets/page.tsx": "timesheets",
  "payments/page.tsx": "payments",
  "lien-waivers/page.tsx": "lienWaivers",
  "job-costing/page.tsx": "jobCosting",
  "notifications/page.tsx": "notifications",
  "milestones/page.tsx": "milestones",
  "expenses/page.tsx": "expenses",
  "work-orders/page.tsx": "workOrders",
  "dispatch/page.tsx": "dispatch",
  "leads/page.tsx": "leads",
  "reports/page.tsx": "reports",
  "settings/page.tsx": "settings",
  "billing/page.tsx": "billing",
  "clean-phases/page.tsx": "cleanPhases",
};

for (const [rel, ns] of Object.entries(PAGES)) {
  const file = join(WEB, rel);
  let src = await readFile(file, "utf8");
  if (src.includes("useTranslations")) {
    console.log(`skip (already i18n): ${rel}`);
    continue;
  }

  if (!src.includes('"use client"')) {
    console.log(`skip (not client): ${rel}`);
    continue;
  }

  // Add import
  if (!src.includes("next-intl")) {
    src = src.replace(
      /"use client";\n\n/,
      `"use client";\n\nimport { useTranslations } from "next-intl";\n`,
    );
  }

  // Insert hooks after useAppPage line
  const hookBlock = `  const t = useTranslations("modules.${ns}");\n  const tc = useTranslations("modules.common");\n`;
  if (src.includes("useAppPage()")) {
    src = src.replace(
      /(const \{[^}]+\} = useAppPage\(\);)\n/,
      `$1\n${hookBlock}`,
    );
  } else if (src.includes("useAppPage();")) {
    src = src.replace(/(useAppPage\(\);)\n/, `$1\n${hookBlock}`);
  } else {
    console.log(`skip (no useAppPage): ${rel}`);
    continue;
  }

  // ModulePage title/subtitle
  src = src.replace(
    /<ModulePage title="[^"]*" subtitle="[^"]*">/,
    `<ModulePage title={t("title")} subtitle={t("subtitle")}>`,
  );
  src = src.replace(
    /<ModulePage title="[^"]*" subtitle=\{[^}]+\}[^>]*>/,
    `<ModulePage title={t("title")} subtitle={t("subtitle", { email: user?.email ?? "" })}>`,
  );

  // Common empty state patterns
  src = src.replace(/<h3 className="text-lg font-semibold">No [^<]+<\/h3>/g, `<h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>`);
  src = src.replace(
    /<p className="mt-2 text-sm text-\[var\(--brand-text-secondary\)\]">[^<{][^<]*<\/p>/,
    `<p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>`,
  );

  await writeFile(file, src, "utf8");
  console.log(`patched: ${rel}`);
}
