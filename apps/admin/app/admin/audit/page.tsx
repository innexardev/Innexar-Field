"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformAuditEntry } from "@fieldforge/sdk";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

export default function AuditPage() {
  const { client } = useAdminPage();
  const [entries, setEntries] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.listAuditLog({ limit: 100 });
      setEntries(res.data);
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
      <PageHeader
        title="Audit log"
        subtitle="Read-only record of platform admin actions."
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading audit log…</p>
      ) : (
        <DataTable
          columns={[
            { key: "time", label: "Time" },
            { key: "action", label: "Action" },
            { key: "resource", label: "Resource" },
            { key: "admin", label: "Admin" },
          ]}
          rows={entries.map((e) => ({
            id: e.id,
            cells: {
              time: (
                <span className="text-xs whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              ),
              action: <Badge>{e.action}</Badge>,
              resource: (
                <span className="text-xs">
                  {e.resource_type}
                  {e.resource_id ? ` · ${e.resource_id}` : ""}
                </span>
              ),
              admin: <code className="text-xs">{e.admin_id ?? "—"}</code>,
            },
          }))}
          emptyMessage="No audit entries yet."
        />
      )}
    </>
  );
}
