"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PermitAlert, Project } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

function alertTone(severity: PermitAlert["severity"]): "default" | "success" | "warning" {
  if (severity === "expired") return "warning";
  if (severity === "expires_today" || severity === "expiring_soon") return "warning";
  return "default";
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.projectDetail");
  const tc = useTranslations("modules.common");
  const [project, setProject] = useState<Project | null>(null);
  const [permitAlerts, setPermitAlerts] = useState<PermitAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const [p, alerts] = await Promise.all([
      client.getProject(params.id),
      client.listProjectPermitAlerts(params.id),
    ]);
    setProject(p);
    setPermitAlerts(alerts.data);
  }, [token, client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <ModulePage title={tc("project")} subtitle={tc("loading")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!project) {
    return (
      <ModulePage title={tc("project")} subtitle={tc("notFound")}>
        <Link href="/projects" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToProjects")}
        </Link>
      </ModulePage>
    );
  }

  return (
    <ModulePage title={project.name} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/projects" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("allProjects")}
        </Link>
        <Badge tone={project.status === "completed" ? "success" : "default"}>{project.status}</Badge>
      </div>

      {permitAlerts.length > 0 && (
        <Card className="mb-6 border-[var(--brand-warning)]">
          <CardHeader>
            <CardTitle>Permit expiry alerts</CardTitle>
            <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
              Permits expiring within 30 days or already past due.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {permitAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-3 text-sm"
              >
                <span>{alert.message}</span>
                <div className="flex items-center gap-2">
                  {alert.jurisdiction && (
                    <span className="text-[var(--brand-text-muted)]">{alert.jurisdiction}</span>
                  )}
                  <Badge tone={alertTone(alert.severity)}>{alert.severity.replace(/_/g, " ")}</Badge>
                </div>
              </div>
            ))}
            <Link
              href={`/permits?project_id=${project.id}`}
              className="inline-block text-sm text-[var(--brand-accent)] hover:underline"
            >
              View all permits →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-[var(--brand-border)] pb-3">
              <span className="text-[var(--brand-text-muted)]">Budget</span>
              <span className="text-lg font-semibold">{formatCents(project.budget_cents)}</span>
            </div>
            {project.start_date && (
              <div className="flex justify-between">
                <span className="text-[var(--brand-text-muted)]">Start date</span>
                <span>{project.start_date}</span>
              </div>
            )}
            {project.end_date && (
              <div className="flex justify-between">
                <span className="text-[var(--brand-text-muted)]">End date</span>
                <span>{project.end_date}</span>
              </div>
            )}
            {project.notes && (
              <div>
                <div className="mb-1 text-[var(--brand-text-muted)]">Notes</div>
                <p className="text-[var(--brand-text-secondary)]">{project.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href={`/milestones?project_id=${project.id}`}
              className="block w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-center text-sm font-medium transition hover:border-[var(--brand-accent)]"
            >
              Milestones
            </Link>
            <Link
              href={`/projects/${project.id}/daily-logs`}
              className="block w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-center text-sm font-medium transition hover:border-[var(--brand-accent)]"
            >
              Daily logs
            </Link>
            <Link
              href={`/change-orders?project_id=${project.id}`}
              className="block w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-center text-sm font-medium transition hover:border-[var(--brand-accent)]"
            >
              Change orders
            </Link>
            <Link
              href={`/permits?project_id=${project.id}`}
              className="block w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-center text-sm font-medium transition hover:border-[var(--brand-accent)]"
            >
              Permits
            </Link>
            {project.customer_id && (
              <Link
                href={`/customers/${project.customer_id}`}
                className="block w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-center text-sm font-medium transition hover:border-[var(--brand-accent)]"
              >
                View customer
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
