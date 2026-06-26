"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformTenant } from "@fieldforge/sdk";
import { AdminPage } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

export default function TenantsPage() {
  const { client } = useAdminPage();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.listTenants();
      setTenants(res.data);
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
      <PageHeader title="Tenants" subtitle="All workspaces on the platform." />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading tenants…</p>
      ) : (
        <DataTable
          columns={[
            { key: "name", label: "Tenant" },
            { key: "plan", label: "Plan" },
            { key: "industry", label: "Industry" },
            { key: "status", label: "Status" },
            { key: "created", label: "Created" },
          ]}
          rows={tenants.map((t) => ({
            id: t.id,
            cells: {
              name: (
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-[var(--brand-text-muted)]">{t.slug}</p>
                </div>
              ),
              plan: <code className="text-xs">{t.plan_id}</code>,
              industry: t.industry_pack,
              status: t.suspended_at ? (
                <Badge tone="default">Suspended</Badge>
              ) : (
                <Badge tone="success">{t.subscription_status || "active"}</Badge>
              ),
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
      )}
    </AdminPage>
  );
}
