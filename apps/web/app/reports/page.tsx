"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ReportDataSource, ReportKpi, ReportSummary } from "@fieldforge/sdk";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconChart,
  IconReceipt,
  IconSparkles,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { ReportSourceBadge } from "@/components/report-source-badge";
import { useAppPage } from "@/lib/use-app-page";

const CATEGORY_META: Record<string, { title: string; icon: typeof IconChart }> = {
  financial: { title: "Financial KPIs", icon: IconReceipt },
  operations: { title: "Operations KPIs", icon: IconChart },
};

const REPORT_ICONS: Record<string, typeof IconChart> = {
  pl: IconReceipt,
  "cash-flow": IconChart,
  wip: IconSparkles,
};

export default function ReportsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.reports");
  const tc = useTranslations("modules.common");
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [source, setSource] = useState<ReportDataSource>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      client.listReportKpis(),
      client.getProfitAndLossReport(),
      client.getCashFlowReport(),
      client.getWIPReport(),
    ])
      .then(([kpiRes, pl, cashFlow, wip]) => {
        setKpis(kpiRes.data);
        setSource(kpiRes.source ?? pl.source ?? cashFlow.source ?? wip.source);
        setReports([pl.data, cashFlow.data, wip.data]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportKpi[]>();
    for (const kpi of kpis) {
      const list = map.get(kpi.category) ?? [];
      list.push(kpi);
      map.set(kpi.category, list);
    }
    return map;
  }, [kpis]);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")} actions={<ReportSourceBadge source={source} />}>
      {loading ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="animate-pulse border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))]">
                <CardContent className="py-6">
                  <div className="h-4 w-24 rounded bg-[var(--brand-surface-elevated)]" />
                  <div className="mt-4 h-8 w-32 rounded bg-[var(--brand-surface-elevated)]" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : reports.length === 0 && kpis.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconChart size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <IconSparkles size={18} className="text-[var(--brand-accent)]" />
              <h2 className="text-lg font-semibold text-[var(--brand-text-primary)]">Financial reports</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report, i) => {
                const Icon = REPORT_ICONS[report.id] ?? IconChart;
                return (
                  <a key={report.id} href={report.href} className="stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                    <Card
                      variant="interactive"
                      className="h-full border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))]"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)] text-[var(--brand-accent)]">
                            <Icon size={20} />
                          </div>
                          <span className="text-xs text-[var(--brand-text-muted)]">{report.period}</span>
                        </div>
                        <CardTitle className="mt-3 text-base">{report.title}</CardTitle>
                        <p className="text-sm text-[var(--brand-text-secondary)]">{report.description}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="stat-value">{report.value}</p>
                        {report.delta && (
                          <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{report.delta}</p>
                        )}
                        <p className="mt-3 text-sm font-medium text-[var(--brand-accent)]">
                          Open in accounting →
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          </section>

          {Array.from(grouped.entries()).map(([category, items]) => {
            const meta = CATEGORY_META[category] ?? { title: category, icon: IconChart };
            const Icon = meta.icon;
            return (
              <section key={category}>
                <div className="mb-4 flex items-center gap-2">
                  <Icon size={18} className="text-[var(--brand-accent)]" />
                  <h2 className="text-lg font-semibold text-[var(--brand-text-primary)]">{meta.title}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((kpi, i) => (
                    <Card key={kpi.id} className="stat-card stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-[var(--brand-text-muted)]">{kpi.label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="stat-value">{kpi.value}</p>
                        {kpi.delta && <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{kpi.delta}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </ModulePage>
  );
}
