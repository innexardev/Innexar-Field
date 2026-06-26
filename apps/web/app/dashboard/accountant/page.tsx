"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { AccountantDashboard, ReportDataSource } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle, IconCreditCard, IconReceipt } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { ReportSourceBadge } from "@/components/report-source-badge";
import { useAppPage } from "@/lib/use-app-page";

const BUCKET_LABELS: Record<string, string> = {
  current: "Current",
  "30": "1–30 days",
  "60": "31–60 days",
  "90": "61–90 days",
  "90+": "90+ days",
};

export default function AccountantDashboardPage() {
  const { client, token, user } = useAppPage();
  const t = useTranslations("modules.dashboardAccountant");
  const tc = useTranslations("modules.common");
  const [data, setData] = useState<AccountantDashboard | null>(null);
  const [source, setSource] = useState<ReportDataSource>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    client
      .getAccountantDashboard()
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
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="stat-card animate-pulse">
              <CardContent className="py-5">
                <div className="h-4 w-28 rounded bg-[var(--brand-surface-elevated)]" />
                <div className="mt-3 h-8 w-24 rounded bg-[var(--brand-surface-elevated)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconCreditCard size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">Unable to load dashboard</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
            Check your connection and try again.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCreditCard size={18} className="text-[var(--brand-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--brand-text-primary)]">AR aging</h2>
              </div>
              <a href="/accounting/ar" className="text-sm text-[var(--brand-accent)] hover:underline">
                View AR →
              </a>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <Card className="stat-card stagger-item">
                <CardContent className="py-4">
                  <p className="stat-label">Total outstanding</p>
                  <p className="stat-value mt-1">{data.ar_aging.total}</p>
                </CardContent>
              </Card>
              <Card className="stat-card stagger-item" style={{ animationDelay: "60ms" }}>
                <CardContent className="py-4">
                  <p className="stat-label">Over 30 days</p>
                  <p className="stat-value mt-1">{data.ar_aging.over_30}</p>
                </CardContent>
              </Card>
              <Card className="stat-card stagger-item" style={{ animationDelay: "120ms" }}>
                <CardContent className="py-4">
                  <p className="stat-label">Overdue invoices</p>
                  <p className="stat-value mt-1">{data.ar_aging.overdue_count}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                {data.ar_aging.buckets.map((bucket, i) => (
                  <div
                    key={bucket.bucket}
                    className="rounded-lg bg-[var(--brand-surface-elevated)] px-4 py-3 stagger-item"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <p className="text-xs text-[var(--brand-text-muted)]">
                      {BUCKET_LABELS[bucket.bucket] ?? bucket.bucket}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{bucket.amount}</p>
                    <p className="text-xs text-[var(--brand-text-secondary)]">
                      {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconReceipt size={18} className="text-[var(--brand-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--brand-text-primary)]">Pending expenses</h2>
              </div>
              <a href="/expenses" className="text-sm text-[var(--brand-accent)] hover:underline">
                Review expenses →
              </a>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <Card className="stat-card">
                <CardContent className="py-4">
                  <p className="stat-label">Awaiting approval</p>
                  <p className="stat-value mt-1">{data.pending_expenses.count}</p>
                </CardContent>
              </Card>
              <Card className="stat-card">
                <CardContent className="py-4">
                  <p className="stat-label">Total pending</p>
                  <p className="stat-value mt-1">{data.pending_expenses.total}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent submissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.pending_expenses.items.length === 0 ? (
                  <p className="text-sm text-[var(--brand-text-secondary)]">No pending expense submissions.</p>
                ) : (
                  data.pending_expenses.items.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-[var(--brand-surface-elevated)] px-3 py-3 stagger-item"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div>
                        <div className="font-medium">{item.description}</div>
                        <div className="text-xs text-[var(--brand-text-muted)] capitalize">{item.category}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{item.amount}</span>
                        <Badge tone="warning">Pending</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <div>
            <a href="/reports" className="text-sm font-medium text-[var(--brand-accent)] hover:underline">
              View financial reports →
            </a>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
