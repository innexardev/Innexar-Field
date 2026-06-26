"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconBuilding,
  IconChart,
  IconCreditCard,
  IconUsers,
} from "@fieldforge/ui";
import { formatErrorForUser, type PlatformMetrics, type PlatformTenant } from "@fieldforge/sdk";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useAdminPage } from "@/lib/use-admin-page";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function BarChart({
  data,
  label,
  emptyLabel,
}: {
  data: Record<string, number>;
  label: string;
  emptyLabel: string;
}) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => v > 0);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return <p className="text-sm text-[var(--brand-text-secondary)]">{emptyLabel}</p>;
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

function TenantTable({
  tenants,
  emptyTitle,
  emptyDescription,
  t,
  tc,
}: {
  tenants: PlatformTenant[];
  emptyTitle: string;
  emptyDescription: string;
  t: ReturnType<typeof useTranslations<"admin.pages.dashboard">>;
  tc: ReturnType<typeof useTranslations<"admin.common">>;
}) {
  function tenantStatusBadge(tenant: PlatformTenant) {
    if (tenant.suspended_at) {
      return <Badge tone="default">{tc("suspended")}</Badge>;
    }
    if (tenant.subscription_status === "past_due" || tenant.subscription_status === "unpaid") {
      return <Badge tone="warning">{tenant.subscription_status}</Badge>;
    }
    if (tenant.subscription_status === "canceled") {
      return <Badge tone="default">{tc("churned")}</Badge>;
    }
    return <Badge tone="success">{tenant.subscription_status || "active"}</Badge>;
  }

  return (
    <DataTable
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyIcon={IconBuilding}
      actionsLabel={tc("actions")}
      columns={[
        { key: "name", label: "Tenant" },
        { key: "plan", label: "Plan" },
        { key: "status", label: "Status" },
        { key: "created", label: "Created" },
      ]}
      rows={(tenants ?? []).map((row) => ({
        id: row.id,
        cells: {
          name: (
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-xs text-[var(--brand-text-muted)]">{row.slug}</p>
            </div>
          ),
          plan: <code className="text-xs">{row.plan_id}</code>,
          status: tenantStatusBadge(row),
          created: new Date(row.created_at).toLocaleDateString(),
        },
        actions: (
          <Link href={`/admin/tenants/${row.id}`}>
            <Button size="sm" variant="secondary">
              {tc("view")}
            </Button>
          </Link>
        ),
      }))}
    />
  );
}

export default function DashboardPage() {
  const { client } = useAdminPage();
  const t = useTranslations("admin.pages.dashboard");
  const tc = useTranslations("admin.common");
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
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("loadingMetrics")}</p>
      ) : metrics ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("totalTenants")}
              value={metrics.total_tenants}
              hint={t("suspendedCount", { count: metrics.suspended_tenants })}
              icon={IconBuilding}
              tone="accent"
            />
            <StatCard
              label={t("activeSubscriptions")}
              value={metrics.active_subscriptions}
              hint={t("trialingPastDue", {
                trialing: metrics.trialing,
                pastDue: metrics.past_due,
              })}
              icon={IconCreditCard}
              tone="success"
            />
            <StatCard
              label={t("mrrEstimate")}
              value={formatCurrency(metrics.mrr_estimate_cents)}
              hint={t("mrrHint")}
              icon={IconChart}
              tone="info"
            />
            <StatCard
              label={t("totalUsers")}
              value={metrics.total_users}
              hint={t("usersHint")}
              icon={IconUsers}
              tone="default"
            />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("trialing")} value={metrics.trialing} tone="info" />
            <StatCard label={t("pastDue")} value={metrics.past_due} tone="warning" />
            <StatCard label={t("churned")} value={metrics.churned} tone="default" />
            <StatCard
              label={t("newSignups")}
              value={
                <>
                  {metrics.signups_last_7_days}
                  <span className="ml-2 text-base font-normal text-[var(--brand-text-secondary)]">
                    {t("signupsPeriod", {
                      seven: metrics.signups_last_7_days,
                      thirty: metrics.signups_last_30_days,
                    })}
                  </span>
                </>
              }
              hint={t("last7Days")}
              tone="success"
            />
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("tenantsByPlan")}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={metrics.tenants_by_plan ?? {}}
                  label="plan"
                  emptyLabel={t("noChartData", { label: "plan" })}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("subscriptionsByStatus")}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={metrics.subscription_by_status ?? {}}
                  label="status"
                  emptyLabel={t("noChartData", { label: "status" })}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-1 text-base font-semibold text-[var(--brand-text-primary)]">
                {t("tenantsNeedingAttention")}
              </h2>
              <p className="mb-4 text-sm text-[var(--brand-text-secondary)]">
                {t("tenantsNeedingAttentionHint")}
              </p>
              <TenantTable
                tenants={metrics.tenants_needing_attention ?? []}
                emptyTitle={t("emptyAttention")}
                emptyDescription={t("emptyAttentionDesc")}
                t={t}
                tc={tc}
              />
            </section>

            <section>
              <h2 className="mb-1 text-base font-semibold text-[var(--brand-text-primary)]">
                {t("recentTenants")}
              </h2>
              <p className="mb-4 text-sm text-[var(--brand-text-secondary)]">{t("recentTenantsHint")}</p>
              <TenantTable
                tenants={metrics.recent_tenants ?? []}
                emptyTitle={t("emptyTenants")}
                emptyDescription={t("emptyTenantsDesc")}
                t={t}
                tc={tc}
              />
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
