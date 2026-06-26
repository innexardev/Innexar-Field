"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Employee, Job, WorkOrder, WorkOrderAssignment } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { NavigateButton } from "@/components/maps/navigate-button";
import { buildDirectionsUrl, resolveJobDirectionsUrl } from "@/lib/maps";
import { useAppPage } from "@/lib/use-app-page";

const STATUS_ORDER = ["open", "assigned", "in_progress", "completed", "cancelled"];

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusTone(status: string): "default" | "success" | "warning" {
  if (status === "completed") return "success";
  if (status === "cancelled") return "warning";
  return "default";
}

function priorityTone(priority: string): "default" | "success" | "warning" {
  if (priority === "urgent" || priority === "high") return "warning";
  return "default";
}

function employeeName(emp: Employee) {
  return `${emp.first_name} ${emp.last_name}`.trim();
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.workOrderDetail");
  const tc = useTranslations("modules.common");
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [assignments, setAssignments] = useState<WorkOrderAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [linkedJob, setLinkedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [technicianId, setTechnicianId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [directionsUrl, setDirectionsUrl] = useState("");

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const emp of employees) map.set(emp.id, emp);
    return map;
  }, [employees]);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const [wo, assignmentRes, employeeRes] = await Promise.all([
      client.getWorkOrder(params.id),
      client.listWorkOrderAssignments(params.id),
      client.listEmployees(),
    ]);
    setWorkOrder(wo);
    setAssignments(assignmentRes.data ?? []);
    setEmployees(employeeRes.data ?? []);
    if (wo.job_id) {
      try {
        const job = await client.getJob(wo.job_id);
        setLinkedJob(job);
      } catch {
        setLinkedJob(null);
      }
    } else {
      setLinkedJob(null);
    }
  }, [token, client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!workOrder) {
      setDirectionsUrl("");
      return;
    }
    if (linkedJob) {
      setDirectionsUrl(buildDirectionsUrl({ address: linkedJob.title }));
      void resolveJobDirectionsUrl(client, linkedJob).then(setDirectionsUrl);
      return;
    }
    setDirectionsUrl(buildDirectionsUrl({ address: workOrder.title }));
  }, [workOrder, linkedJob, client]);

  async function onStatusChange(status: string) {
    if (!workOrder || status === workOrder.status) return;
    setUpdatingStatus(true);
    try {
      const updated = await client.updateWorkOrder(workOrder.id, { status });
      setWorkOrder(updated);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!workOrder || !technicianId) return;
    setAssigning(true);
    try {
      const assignment = await client.createWorkOrderAssignment(workOrder.id, {
        technician_id: technicianId,
      });
      setAssignments((prev) => [assignment, ...prev]);
      setTechnicianId("");
      if (workOrder.status === "open") {
        const updated = await client.updateWorkOrder(workOrder.id, { status: "assigned" });
        setWorkOrder(updated);
      }
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <ModulePage title={tc("workOrder")} subtitle={tc("loading")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!workOrder) {
    return (
      <ModulePage title={tc("workOrder")} subtitle={tc("notFound")}>
        <Link href="/work-orders" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("allWorkOrders")}
        </Link>
      </ModulePage>
    );
  }

  return (
    <ModulePage title={workOrder.title} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/work-orders" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("allWorkOrders")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <NavigateButton href={directionsUrl} />
          <Badge tone={priorityTone(workOrder.priority)}>{workOrder.priority}</Badge>
          <Badge tone={statusTone(workOrder.status)}>{statusLabel(workOrder.status)}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("detailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workOrder.description && (
              <p className="text-sm text-[var(--brand-text-secondary)]">{workOrder.description}</p>
            )}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--brand-text-muted)]">{tc("priority")}</dt>
                <dd className="font-medium capitalize">{workOrder.priority}</dd>
              </div>
              <div>
                <dt className="text-[var(--brand-text-muted)]">{t("slaDue")}</dt>
                <dd className="font-medium">{formatDateTime(workOrder.sla_due_at)}</dd>
              </div>
              <div>
                <dt className="text-[var(--brand-text-muted)]">{t("created")}</dt>
                <dd className="font-medium">{formatDateTime(workOrder.created_at)}</dd>
              </div>
              <div>
                <dt className="text-[var(--brand-text-muted)]">{t("updated")}</dt>
                <dd className="font-medium">{formatDateTime(workOrder.updated_at)}</dd>
              </div>
            </dl>
            {workOrder.job_id && (
              <div className="rounded-lg border border-[var(--brand-border)] p-4">
                <h3 className="text-sm font-semibold">{t("linkedJobTitle")}</h3>
                {linkedJob ? (
                  <Link href="/jobs" className="mt-1 text-sm text-[var(--brand-accent)] hover:underline">
                    {linkedJob.title}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                    {tc("linkedJob", { id: workOrder.job_id.slice(0, 8) })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("statusTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="form-label" htmlFor="wo-status">
              {t("statusLabel")}
            </label>
            <select
              id="wo-status"
              className="form-select mt-1 w-full"
              value={workOrder.status}
              disabled={updatingStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("assignmentsTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("assignmentsDescription")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={onAssign} className="flex flex-wrap items-end gap-4">
            <div className="form-field min-w-[220px] flex-1">
              <label className="form-label" htmlFor="wo-technician">
                {t("selectTechnician")}
              </label>
              <select
                id="wo-technician"
                className="form-select"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                required
              >
                <option value="">{t("selectTechnicianPlaceholder")}</option>
                {employees
                  .filter((emp) => emp.status === "active")
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {employeeName(emp)}
                    </option>
                  ))}
              </select>
            </div>
            <Button type="submit" disabled={assigning || !technicianId}>
              {assigning ? t("assigning") : t("assignTechnician")}
            </Button>
          </form>

          {assignments.length === 0 ? (
            <p className="text-sm text-[var(--brand-text-muted)]">{t("noAssignments")}</p>
          ) : (
            <ul className="space-y-2">
              {assignments.map((assignment) => {
                const emp = employeeById.get(assignment.technician_id);
                const name = emp ? employeeName(emp) : assignment.technician_id.slice(0, 8);
                return (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{name}</div>
                      <div className="text-[var(--brand-text-muted)]">
                        {t("assignedAt", { date: formatDateTime(assignment.assigned_at) })}
                      </div>
                    </div>
                    <Badge>{statusLabel(assignment.status)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </ModulePage>
  );
}
