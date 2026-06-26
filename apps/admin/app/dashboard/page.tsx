"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformMetrics, type PlatformTenant } from "@fieldforge/sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { AdminPage } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function BarChart({ data, label }: { data: Record<string, number>; label: string }) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => v > 0);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return <p className="text-sm text-[var(--brand-text-secondary)]">No {label.toLowerCase()} data yet.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, count]) => (
        <div key={key}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-[var(--brand-text-primary)]">{key}</span>
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

function tenantStatusBadge(tenant: PlatformTenant) {
  if (tenant.suspended_at) {
    return <Badge tone="default">Suspended</Badge>;
  }
  if (tenant.subscription_status === "past_due" || tenant.subscription_status === "unpaid") {
    return <Badge tone="warning">{tenant.subscription_status}</Badge>;
  }
  if (tenant.subscription_status === "canceled") {
    return <Badge tone="default">Churned</Badge>;
  }
  return <Badge tone="success">{tenant.subscription_status || "active"}</Badge>;
}

function TenantTable({ tenants, emptyMessage }: { tenants: PlatformTenant[]; emptyMessage: string }) {
  return (
    <DataTable
      emptyMessage={emptyMessage}
      columns={[
        { key: "name", label: "Tenant" },
        { key: "plan", label: "Plan" },
        { key: "status", label: "Status" },
        { key: "created", label: "Created" },
      ]}
      rows={(tenants ?? []).map((t) => ({
        id: t.id,
        cells: {
          name: (
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-[var(--brand-text-muted)]">{t.slug}</p>
            </div>
          ),
          plan: <code className="text-xs">{t.plan_id}</code>,
          status: tenantStatusBadge(t),
          created: new Date(t.created_at).toLocaleDateString(),
        },
        actions: (
          <Link href={`/tenants/${t.id}`}>
            <Button size="sm" variant="secondary">
              View
            </Button>
          </Link>
        ),
      }))}
    />
  );
}

export default function DashboardPage() {
  const { client } = useAdminPage();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await client.getMetrics();
      setMetrics(data);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AdminPage>
      <PageHeader
        title="Dashboard"
        subtitle="Platform-wide SaaS metrics, billing health, and tenant activity."
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading metrics…</p>
      ) : metrics ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Total tenants
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--brand-text-primary)]">
                {metrics.total_tenants}
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">
                {metrics.suspended_tenants} suspended
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Active subscriptions
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--brand-text-primary)]">
                {metrics.active_subscriptions}
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">
                {metrics.trialing} trialing · {metrics.past_due} past due
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                MRR (estimate)
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--brand-text-primary)]">
                {formatCurrency(metrics.mrr_estimate_cents)}
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">
                Plan prices × active subscriptions
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Total users
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--brand-text-primary)]">
                {metrics.total_users}
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">
                Across all workspaces
              </p>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Trialing
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--brand-text-primary)]">{metrics.trialing}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Past due
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--brand-text-primary)]">{metrics.past_due}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                Churned
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--brand-text-primary)]">{metrics.churned}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                New signups
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--brand-text-primary)]">
                {metrics.signups_last_7_days}
                <span className="ml-2 text-base font-normal text-[var(--brand-text-secondary)]">
                  / {metrics.signups_last_30_days} (30d)
                </span>
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">Last 7 days</p>
            </div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tenants by plan</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={metrics.tenants_by_plan ?? {}} label="plan" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions by status</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={metrics.subscription_by_status ?? {}} label="status" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-base font-semibold text-[var(--brand-text-primary)]">
                Tenants needing attention
              </h2>
              <p className="mb-4 text-sm text-[var(--brand-text-secondary)]">
                Past due, unpaid, or suspended workspaces.
              </p>
              <TenantTable
                tenants={metrics.tenants_needing_attention ?? []}
                emptyMessage="No tenants need attention right now."
              />
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-[var(--brand-text-primary)]">
                Recent tenants
              </h2>
              <p className="mb-4 text-sm text-[var(--brand-text-secondary)]">
                Latest signups on the platform.
              </p>
              <TenantTable tenants={metrics.recent_tenants ?? []} emptyMessage="No tenants yet." />
            </section>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
