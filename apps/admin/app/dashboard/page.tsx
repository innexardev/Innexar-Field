"use client";

import { useCallback, useEffect, useState } from "react";
import { formatErrorForUser, type PlatformStats } from "@fieldforge/sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { AdminPage } from "@/components/admin-shell";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function PlanChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return <p className="text-sm text-[var(--brand-text-secondary)]">No tenant plan data yet.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([plan, count]) => (
        <div key={plan}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-[var(--brand-text-primary)]">{plan}</span>
            <span className="text-[var(--brand-text-secondary)]">{count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--brand-surface-elevated)]">
            <div
              className="h-full rounded-full bg-[var(--brand-accent)] transition-all"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { client } = useAdminPage();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await client.getStats();
      setStats(data);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const revenueStub = stats ? stats.active_tenants * 4900 : 0;

  return (
    <AdminPage>
      <PageHeader
        title="Dashboard"
        subtitle="Platform-wide metrics and tenant distribution."
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading stats…</p>
      ) : stats ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Total tenants
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--brand-text-primary)]">
                {stats.total_tenants}
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">
                {stats.active_tenants} active · {stats.suspended_tenants} suspended
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Signups (30 days)
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--brand-text-primary)]">
                {stats.signups_last_30_days}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Revenue (est.)
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--brand-text-primary)]">
                {formatCurrency(revenueStub)}
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">Stub: active × $49/mo</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Active modules
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--brand-text-primary)]">
                {stats.total_plans}
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">
                {stats.active_promotions} active promotions
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tenants by plan</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanChart data={stats.tenants_by_plan} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </AdminPage>
  );
}
