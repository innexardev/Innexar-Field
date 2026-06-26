"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformPlan, type PlatformTenant } from "@fieldforge/sdk";
import { AdminPage } from "@/components/admin-shell";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const { client } = useAdminPage();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tenantRes, planRes] = await Promise.all([client.listTenants(), client.listPlans()]);
      const found = tenantRes.data.find((t) => t.id === tenantId) ?? null;
      setTenant(found);
      setPlans(planRes.data);
      if (found) setPlanId(found.plan_id);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client, tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function assignPlan() {
    if (!tenant) return;
    setSaving(true);
    setError("");
    try {
      const updated = await client.updateTenant(tenant.id, { plan_id: planId });
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
      <div className="mb-4">
        <Link href="/tenants" className="text-sm text-[var(--brand-accent)]">
          ← Back to tenants
        </Link>
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
                <div className="flex justify-between">
                  <span className="text-[var(--brand-text-secondary)]">ID</span>
                  <code>{tenant.id}</code>
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
                <CardTitle>Assign plan</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="form-label">Plan</label>
                <select
                  className="mb-4 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
                <Button onClick={() => void assignPlan()} disabled={saving}>
                  {saving ? "Saving…" : "Update plan"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AdminPage>
  );
}
