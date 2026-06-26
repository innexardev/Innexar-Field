"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { DispatcherDashboard, ReportDataSource } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle, IconCalendar, IconTruck, IconUsers } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { ReportSourceBadge } from "@/components/report-source-badge";
import { useAppPage } from "@/lib/use-app-page";

const DISPATCHER_KPIS = [
  { key: "jobs_today" as const, label: "Jobs today", icon: IconCalendar },
  { key: "overdue" as const, label: "Overdue", icon: IconTruck },
  { key: "crew_available" as const, label: "Crew availability", icon: IconUsers },
  { key: "crews_on_route" as const, label: "Crews on route", icon: IconTruck },
];

const BOARD_COLORS: Record<string, string> = {
  unassigned: "var(--brand-warning)",
  en_route: "var(--brand-accent)",
  on_site: "var(--brand-success)",
  complete: "var(--brand-text-muted)",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function DispatcherDashboardPage() {
  const { client, token, user } = useAppPage();
  const t = useTranslations("modules.dashboardDispatcher");
  const tc = useTranslations("modules.common");
  const [data, setData] = useState<DispatcherDashboard | null>(null);
  const [source, setSource] = useState<ReportDataSource>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    client
      .getDispatcherDashboard()
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DISPATCHER_KPIS.map((kpi) => (
            <Card key={kpi.key} className="stat-card animate-pulse">
              <CardContent className="py-5">
                <div className="h-4 w-24 rounded bg-[var(--brand-surface-elevated)]" />
                <div className="mt-3 h-8 w-16 rounded bg-[var(--brand-surface-elevated)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconTruck size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">Unable to load dashboard</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
            Check your connection and try again.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {DISPATCHER_KPIS.map((kpi, i) => {
              const Icon = kpi.icon;
              const metric = data[kpi.key];
              return (
                <Card key={kpi.key} className="stat-card stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between">
                      <p className="stat-label">{kpi.label}</p>
                      <Icon size={18} className="text-[var(--brand-accent)] opacity-70" />
                    </div>
                    <p className="stat-value mt-2">{metric.value}</p>
                    {metric.note && (
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{metric.note}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Dispatch board</CardTitle>
              <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                Today&apos;s workload — open{" "}
                <a href="/dispatch" className="text-[var(--brand-accent)] hover:underline">
                  Dispatch
                </a>{" "}
                for live board
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.board.length === 0 ? (
                  <p className="text-sm text-[var(--brand-text-secondary)] sm:col-span-2 lg:col-span-4">
                    No open work orders or scheduled jobs yet.
                  </p>
                ) : (
                  data.board.map((col, i) => (
                  <div
                    key={col.status}
                    className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] p-4 stagger-item"
                    style={{ animationDelay: `${(i + 4) * 60}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize text-[var(--brand-text-primary)]">
                        {statusLabel(col.status)}
                      </span>
                      <Badge>{col.count}</Badge>
                    </div>
                    <div
                      className="mt-3 h-1 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${BOARD_COLORS[col.status] ?? "var(--brand-accent)"} 40%, transparent)`,
                      }}
                    />
                    <div className="mt-3 space-y-2">
                      {Array.from({ length: Math.min(col.count, 2) }).map((_, j) => (
                        <div
                          key={j}
                          className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-xs"
                        >
                          WO #{1000 + i * 10 + j}
                        </div>
                      ))}
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </ModulePage>
  );
}
