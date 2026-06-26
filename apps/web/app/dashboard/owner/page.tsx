"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { OwnerDashboard, ReportDataSource } from "@fieldforge/sdk";
import { Card, CardContent, CardHeader, CardTitle, IconCalendar, IconChart, IconReceipt } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { ReportSourceBadge } from "@/components/report-source-badge";
import { useAppPage } from "@/lib/use-app-page";

const OWNER_KPIS = [
  { key: "revenue_mtd" as const, label: "Revenue (MTD)", liveLabel: "Revenue (MTD)", icon: IconReceipt },
  { key: "gross_margin" as const, label: "Gross margin", liveLabel: "Outstanding AR", icon: IconChart },
  { key: "active_jobs" as const, label: "Active jobs", liveLabel: "Active jobs", icon: IconCalendar },
];

export default function OwnerDashboardPage() {
  const { client, token, user } = useAppPage();
  const t = useTranslations("modules.dashboardOwner");
  const tc = useTranslations("modules.common");
  const [data, setData] = useState<OwnerDashboard | null>(null);
  const [source, setSource] = useState<ReportDataSource>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    client
      .getOwnerDashboard()
      .then((r) => {
        setData(r.data);
        setSource(r.source);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client]);

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle", { email: user?.email ?? tc("yourWorkspace") })}
      actions={<ReportSourceBadge source={source} />}
    >
      <div className="mb-4">
        <a href="/dashboard" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("mainDashboard")}
        </a>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {OWNER_KPIS.map((kpi) => (
            <Card key={kpi.key} className="stat-card animate-pulse">
              <CardContent className="py-5">
                <div className="h-4 w-24 rounded bg-[var(--brand-surface-elevated)]" />
                <div className="mt-3 h-8 w-32 rounded bg-[var(--brand-surface-elevated)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconChart size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">Unable to load dashboard</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
            Check your connection and try again.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {OWNER_KPIS.map((kpi, i) => {
              const Icon = kpi.icon;
              const metric = data[kpi.key];
              return (
                <Card key={kpi.key} className="stat-card stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between">
                      <p className="stat-label">{source === "live" ? kpi.liveLabel : kpi.label}</p>
                      <Icon size={18} className="text-[var(--brand-accent)] opacity-70" />
                    </div>
                    <p className="stat-value mt-2">{metric.value}</p>
                    {metric.delta && (
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{metric.delta}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue trend</CardTitle>
                <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">Last 7 weeks</p>
              </CardHeader>
              <CardContent>
                <div className="flex h-40 items-end gap-2">
                  {data.revenue_trend.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-[color-mix(in_srgb,var(--brand-accent)_70%,transparent)]"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top jobs by margin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.top_jobs_by_margin.length === 0 ? (
                  <p className="text-sm text-[var(--brand-text-secondary)]">
                    Margin rankings appear once job costing data is available.
                  </p>
                ) : (
                  data.top_jobs_by_margin.map((job, i) => (
                    <div
                      key={job.name}
                      className="flex items-center justify-between rounded-lg bg-[var(--brand-surface-elevated)] px-3 py-2 stagger-item"
                      style={{ animationDelay: `${(i + 3) * 60}ms` }}
                    >
                      <span>{job.name}</span>
                      <span className="font-medium text-[var(--brand-success)]">{job.margin_percent}%</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <a
              href="/reports"
              className="text-sm font-medium text-[var(--brand-accent)] hover:underline"
            >
              View full reports →
            </a>
          </div>
        </>
      )}
    </ModulePage>
  );
}
