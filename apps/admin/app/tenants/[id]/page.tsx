"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformPlan, type PlatformTenant } from "@fieldforge/sdk";
import { AdminPage } from "@/components/admin-shell";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

const INDUSTRY_PACKS = ["field-services", "cleaning", "construction"] as const;
const SUBSCRIPTION_STATUSES = ["trialing", "active", "incomplete", "past_due", "canceled"] as const;

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const { client } = useAdminPage();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [name, setName] = useState("");
  const [industryPack, setIndustryPack] = useState("field-services");
  const [planId, setPlanId] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("trialing");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tenantRes, planRes] = await Promise.all([
        client.getTenant(tenantId),
        client.listPlans(),
      ]);
      setTenant(tenantRes);
      setPlans(planRes.data);
      setName(tenantRes.name);
      setIndustryPack(tenantRes.industry_pack);
      setPlanId(tenantRes.plan_id);
      setSubscriptionStatus(tenantRes.subscription_status || "trialing");
    } catch (e) {
      setError(formatErrorForUser(e));
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [client, tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveDetails() {
    if (!tenant) return;
    setSaving(true);
    setError("");
    try {
      const updated = await client.updateTenant(tenant.id, {
        name,
        industry_pack: industryPack,
        plan_id: planId,
        subscription_status: subscriptionStatus,
      });
      setTenant(updated);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspend() {
    if (!tenant) return;
    setSaving(true);
    setError("");
    const suspended = !tenant.suspended_at;
    try {
      const updated = await client.updateTenant(tenant.id, { suspended });
      setTenant(updated);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/tenants" className="text-sm text-[var(--brand-accent)]">
          ← Back to tenants
        </Link>
        {tenant && (
          <Link href={`/users?tenant=${tenant.id}`} className="text-sm text-[var(--brand-accent)]">
            Manage users →
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading tenant…</p>
      ) : !tenant ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Tenant not found.</p>
      ) : (
        <>
          <PageHeader
            title={tenant.name}
            subtitle={`${tenant.slug} · ${tenant.industry_pack}`}
            actions={
              tenant.suspended_at ? (
                <Button onClick={() => void toggleSuspend()} disabled={saving}>
                  Activate tenant
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => void toggleSuspend()} disabled={saving}>
                  Suspend tenant
                </Button>
              )
            }
          />
          <ErrorBanner message={error} className="mb-4" />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--brand-text-secondary)]">ID</span>
                  <code className="text-right text-xs">{tenant.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--brand-text-secondary)]">Status</span>
                  {tenant.suspended_at ? (
                    <Badge tone="default">Suspended</Badge>
                  ) : (
                    <Badge tone="success">{tenant.subscription_status || "active"}</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--brand-text-secondary)]">Created</span>
                  <span>{new Date(tenant.created_at).toLocaleString()}</span>
                </div>
                {tenant.suspended_at && (
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-text-secondary)]">Suspended at</span>
                    <span>{new Date(tenant.suspended_at).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Edit tenant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="form-field">
                  <label className="form-label">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Industry pack</label>
                  <select
                    className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                    value={industryPack}
                    onChange={(e) => setIndustryPack(e.target.value)}
                  >
                    {INDUSTRY_PACKS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Plan</label>
                  <select
                    className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Subscription status</label>
                  <select
                    className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value)}
                  >
                    {SUBSCRIPTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={() => void saveDetails()} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AdminPage>
  );
}
