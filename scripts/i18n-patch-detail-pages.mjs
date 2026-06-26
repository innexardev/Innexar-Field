#!/usr/bin/env node
/**
 * Adds useTranslations to detail/settings/mobile module pages.
 * Run: node scripts/i18n-patch-detail-pages.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const WEB = join(import.meta.dirname, "../apps/web/app");

/** app-relative path -> { ns, mobile? } */
const PAGES = {
  "cleaning/jobs/[id]/page.tsx": { ns: "cleaningJobDetail", usesEstimates: true },
  "cleaning/qc/page.tsx": { ns: "cleaningQc" },
  "cleaning/supplies/page.tsx": { ns: "cleaningSupplies" },
  "customers/[id]/page.tsx": { ns: "customerDetail" },
  "customers/[id]/invoices/page.tsx": { ns: "customerInvoices", usesInvoices: true },
  "customers/[id]/jobs/page.tsx": { ns: "customerJobs", usesJobs: true },
  "customers/[id]/properties/page.tsx": { ns: "customerProperties", usesProperties: true },
  "dashboard/accountant/page.tsx": { ns: "dashboardAccountant", emailSubtitle: true },
  "dashboard/dispatcher/page.tsx": { ns: "dashboardDispatcher", emailSubtitle: true },
  "dashboard/owner/page.tsx": { ns: "dashboardOwner", emailSubtitle: true },
  "invoices/[id]/page.tsx": { ns: "invoiceDetail" },
  "leads/[id]/page.tsx": { ns: "leadDetail" },
  "m/expenses/page.tsx": { ns: "mobileExpenses", mobile: true },
  "m/profile/page.tsx": { ns: "mobileProfile", mobile: true },
  "m/signature/page.tsx": { ns: "mobileSignature", mobile: true },
  "m/time/page.tsx": { ns: "mobileTime", mobile: true },
  "m/vehicle/page.tsx": { ns: "mobileVehicle", mobile: true },
  "marketplace/page.tsx": { ns: "marketplace" },
  "portal/page.tsx": { ns: "portal", brandSubtitle: true },
  "price-book/import/page.tsx": { ns: "priceBookImport" },
  "projects/[id]/page.tsx": { ns: "projectDetail" },
  "projects/[id]/daily-logs/page.tsx": { ns: "projectDailyLogs", nameSubtitle: true },
  "settings/integrations/page.tsx": { ns: "settingsIntegrations" },
  "settings/modules/page.tsx": { ns: "settingsModules" },
  "settings/users/page.tsx": { ns: "settingsUsers" },
};

function addImport(src) {
  if (src.includes("next-intl")) return src;
  return src.replace(/"use client";\n\n/, `"use client";\n\nimport { useTranslations } from "next-intl";\n`);
}

function addHooks(src, ns) {
  if (src.includes('useTranslations("modules.')) return src;
  const hookBlock = `  const t = useTranslations("modules.${ns}");\n  const tc = useTranslations("modules.common");\n`;
  if (src.includes("useAppPage()")) {
    return src.replace(/(const \{[^}]+\} = useAppPage\(\);)\n/, `$1\n${hookBlock}`);
  }
  if (src.includes("useAuth()")) {
    return src.replace(/(const \{[^}]+\} = useAuth\(\);)\n/, `$1\n${hookBlock}`);
  }
  return src.replace(/(export default function \w+\(\) \{\n)/, `$1${hookBlock}`);
}

for (const [rel, cfg] of Object.entries(PAGES)) {
  const file = join(WEB, rel);
  let src = await readFile(file, "utf8");
  if (src.includes('useTranslations("modules.')) {
    console.log(`skip: ${rel}`);
    continue;
  }

  src = addImport(src);
  src = addHooks(src, cfg.ns);

  const pageComponent = cfg.mobile ? "MobileModulePage" : "ModulePage";

  if (cfg.emailSubtitle) {
    src = src.replace(
      /<ModulePage\n\s+title="[^"]*"\n\s+subtitle=\{`[^`]+`\}\n\s+actions=/,
      `<ModulePage\n      title={t("title")}\n      subtitle={t("subtitle", { email: user?.email ?? tc("yourWorkspace") })}\n      actions=`,
    );
    src = src.replace(
      /← Main dashboard/g,
      `{tc("mainDashboard")}`,
    );
  } else if (cfg.brandSubtitle) {
    src = src.replace(
      /<ModulePage\n\s+title="[^"]*"\n\s+subtitle=\{`[^`]+`\}\n\s*>/,
      `<ModulePage\n      title={t("title")}\n      subtitle={t("subtitle", { brand: brand.name })}\n    >`,
    );
  } else if (cfg.nameSubtitle) {
    src = src.replace(/title="Daily logs" subtitle="Loading…"/, `title={tc("dailyLogs")} subtitle={tc("loading")}`);
    src = src.replace(/title="Daily logs" subtitle="Project not found."/, `title={tc("dailyLogs")} subtitle={tc("projectNotFound")}`);
    src = src.replace(
      /title="Daily logs" subtitle=\{`Field notes for \$\{project\.name\}\.`\}/,
      `title={tc("dailyLogs")} subtitle={t("subtitle", { name: project.name })}`,
    );
    src = src.replace(/Loading…/g, `{tc("loading")}`);
  } else if (cfg.usesEstimates) {
    src = src.replace(/title="Clean job" subtitle="Loading…"/, `title={tc("cleanJob")} subtitle={tc("loading")}`);
    src = src.replace(/title="Clean job" subtitle="Not found."/, `title={tc("cleanJob")} subtitle={tc("notFound")}`);
    src = src.replace(
      /subtitle=\{`\$\{job\.phase\} phase · \$\{formatJobTime\(job\.scheduled_at\)\}`\}/,
      `subtitle={t("cleanJobSubtitle", { phase: job.phase, time: formatJobTime(job.scheduled_at) })}`,
    );
    // cleaningJobDetail uses estimates namespace for cleanJobSubtitle
    src = src.replace(
      'const t = useTranslations("modules.cleaningJobDetail");',
      'const t = useTranslations("modules.estimates");\n  const td = useTranslations("modules.cleaningJobDetail");',
    );
    if (!src.includes("modules.estimates")) {
      src = src.replace(
        `const t = useTranslations("modules.cleaningJobDetail");`,
        `const te = useTranslations("modules.estimates");\n  const t = useTranslations("modules.cleaningJobDetail");`,
      );
      src = src.replace(/t\("cleanJobSubtitle"/, `te("cleanJobSubtitle"`);
    }
  } else if (cfg.usesInvoices || cfg.usesJobs || cfg.usesProperties) {
    const entity = cfg.usesInvoices ? "invoices" : cfg.usesJobs ? "jobs" : "properties";
    const loadingKey = cfg.usesInvoices
      ? "loadingBillingHistory"
      : cfg.usesJobs
        ? "loadingServiceHistory"
        : "loadingServiceLocations";
    const titleKey = cfg.usesInvoices ? "invoice" : cfg.usesJobs ? "job" : "properties";
    src = src.replace(
      new RegExp(`title="${entity === "jobs" ? "Jobs" : entity === "invoices" ? "Invoices" : "Properties"}" subtitle="[^"]*"`),
      (match) => {
        if (match.includes("Loading")) return `title={tc("${titleKey === "properties" ? "properties" : titleKey}")} subtitle={tc("${loadingKey}")}`;
        if (match.includes("not found")) return `title={tc("${titleKey === "properties" ? "properties" : titleKey}")} subtitle={tc("customerNotFound")}`;
        return match;
      },
    );
    src = src.replace(
      /title=\{`\$\{customer\.name\} — (Invoices|Jobs|Properties)`\} subtitle="[^"]*"/,
      `title={tc("titleWithSuffix", { name: customer.name, suffix: t("suffix") })} subtitle={t("subtitle")}`,
    );
  } else if (cfg.mobile) {
    src = src.replace(
      new RegExp(`<MobileModulePage title="[^"]*" subtitle="[^"]*">`),
      `<${pageComponent} title={t("title")} subtitle={t("subtitle")}>`,
    );
  } else if (rel === "customers/[id]/page.tsx") {
    src = src.replace(/title="Customer" subtitle="Loading profile…"/, `title={tc("customer")} subtitle={tc("loadingProfile")}`);
    src = src.replace(/title="Customer" subtitle="Profile not found."/, `title={tc("customer")} subtitle={tc("profileNotFound")}`);
    src = src.replace(
      /title=\{customer\.name\} subtitle="Customer profile, jobs, and invoices."/,
      `title={customer.name} subtitle={t("subtitle")}`,
    );
    src = src.replace(/← Back to customers/g, `{tc("backToCustomers")}`);
    src = src.replace(/Loading…/g, `{tc("loading")}`);
  } else if (rel === "leads/[id]/page.tsx") {
    src = src.replace(/title="Lead" subtitle="Loading…"/, `title={tc("lead")} subtitle={tc("loading")}`);
    src = src.replace(/title="Lead" subtitle="Not found."/, `title={tc("lead")} subtitle={tc("notFound")}`);
    src = src.replace(/title=\{lead\.name\} subtitle="Lead profile and pipeline stage."/, `title={lead.name} subtitle={t("subtitle")}`);
  } else if (rel === "projects/[id]/page.tsx") {
    src = src.replace(/title="Project" subtitle="Loading…"/, `title={tc("project")} subtitle={tc("loading")}`);
    src = src.replace(/title="Project" subtitle="Not found."/, `title={tc("project")} subtitle={tc("notFound")}`);
    src = src.replace(
      /title=\{project\.name\} subtitle="Project budget, schedule, and related records."/,
      `title={project.name} subtitle={t("subtitle")}`,
    );
  } else if (rel === "invoices/[id]/page.tsx") {
    src = src.replace(/title="Invoice" subtitle="Loading…"/, `title={tc("invoice")} subtitle={tc("loading")}`);
    src = src.replace(/title="Invoice" subtitle="Not found."/, `title={tc("invoice")} subtitle={tc("notFound")}`);
    src = src.replace(
      /title=\{invoice\.invoice_number\} subtitle="Invoice detail, send, and collect payment."/,
      `title={invoice.invoice_number} subtitle={t("subtitle")}`,
    );
  } else if (rel === "settings/users/page.tsx") {
    src = src.replace(
      /<ModulePage\n\s+title="Users"\n\s+subtitle="[^"]*"\n\s*>/,
      `<ModulePage\n      title={t("title")}\n      subtitle={t("subtitle")}\n    >`,
    );
    src = src.replace(/← Back to Settings/g, `{tc("backToSettings")}`);
    src = src.replace(/Loading users…/g, `{t("loadingUsers")}`);
  } else {
    src = src.replace(
      /<ModulePage\n\s+title="([^"]*)"\n\s+subtitle="([^"]*)"\n\s*>/,
      `<ModulePage\n      title={t("title")}\n      subtitle={t("subtitle")}\n    >`,
    );
    src = src.replace(
      /<ModulePage\n\s+title="([^"]*)"\n\s+subtitle="([^"]*)"\n\s+actions=/,
      `<ModulePage\n      title={t("title")}\n      subtitle={t("subtitle")}\n      actions=`,
    );
  }

  await writeFile(file, src, "utf8");
  console.log(`patched: ${rel}`);
}
