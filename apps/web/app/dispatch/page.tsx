"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardColumn, Employee } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, IconTruck } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const STATUS_ORDER = ["open", "assigned", "in_progress", "completed", "cancelled"];

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function priorityTone(priority: string): "default" | "success" | "warning" {
  if (priority === "urgent" || priority === "high") return "warning";
  if (priority === "low") return "default";
  return "default";
}

function employeeName(emp: Employee) {
  return `${emp.first_name} ${emp.last_name}`.trim();
}

export default function DispatchPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.dispatch");
  const tc = useTranslations("modules.common");
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    const board = await client.getDispatchBoard();
    setColumns(board.columns);
    setSummary(board.summary);
  }, [client]);

  useEffect(() => {
    if (!token) return;
    Promise.all([loadBoard(), client.listEmployees()])
      .then(([, employeeRes]) => {
        setEmployees(employeeRes.data ?? []);
      })
      .catch(console.error);
  }, [token, client, loadBoard]);

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const emp of employees) map.set(emp.id, emp);
    return map;
  }, [employees]);

  const activeEmployees = useMemo(
    () => employees.filter((emp) => emp.status === "active"),
    [employees],
  );

  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a.status);
      const bi = STATUS_ORDER.indexOf(b.status);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [columns]);

  const total = useMemo(() => Object.values(summary).reduce((n, c) => n + c, 0), [summary]);

  function technicianLabel(technicianId: string) {
    const emp = employeeById.get(technicianId);
    return emp ? employeeName(emp) : technicianId.slice(0, 8);
  }

  async function onAssign(workOrderId: string, currentStatus: string) {
    const technicianId = selectedTechnician[workOrderId];
    if (!technicianId) return;
    setAssigningId(workOrderId);
    try {
      await client.createWorkOrderAssignment(workOrderId, { technician_id: technicianId });
      if (currentStatus === "open") {
        await client.updateWorkOrder(workOrderId, { status: "assigned" });
      }
      await loadBoard();
      setSelectedTechnician((prev) => ({ ...prev, [workOrderId]: "" }));
    } catch (err) {
      console.error(err);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {total === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconTruck size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {sortedColumns.map((col, ci) => (
            <section key={col.status} className="stagger-item" style={{ animationDelay: `${ci * 50}ms` }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold capitalize">{statusLabel(col.status)}</h2>
                <Badge>{col.count}</Badge>
              </div>
              <div className="space-y-3">
                {col.work_orders.length === 0 ? (
                  <p className="text-sm text-[var(--brand-text-muted)]">{t("noItems")}</p>
                ) : (
                  col.work_orders.map((item, i) => {
                    const workOrderId = item.work_order.id;
                    const isAssigning = assigningId === workOrderId;
                    const selected = selectedTechnician[workOrderId] ?? "";

                    return (
                      <Card
                        key={workOrderId}
                        className="list-item-card"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <CardContent className="space-y-3 py-4">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/work-orders/${workOrderId}`}
                              className="font-medium hover:text-[var(--brand-accent)]"
                            >
                              {item.work_order.title}
                            </Link>
                            <Badge tone={priorityTone(item.work_order.priority)}>
                              {item.work_order.priority}
                            </Badge>
                          </div>
                          {item.work_order.description && (
                            <p className="text-sm text-[var(--brand-text-secondary)]">
                              {item.work_order.description}
                            </p>
                          )}
                          <div className="text-xs">
                            {item.assignments.length > 0 ? (
                              <span className="text-[var(--brand-text-secondary)]">
                                {t("assignedTo", {
                                  name: technicianLabel(item.assignments[0].technician_id),
                                })}
                                {item.assignments.length > 1 && ` +${item.assignments.length - 1}`}
                              </span>
                            ) : (
                              <span className="text-[var(--brand-text-muted)]">{tc("unassigned")}</span>
                            )}
                          </div>
                          <form
                            className="flex flex-col gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void onAssign(workOrderId, item.work_order.status);
                            }}
                          >
                            <label className="sr-only" htmlFor={`technician-${workOrderId}`}>
                              {t("selectTechnician")}
                            </label>
                            <select
                              id={`technician-${workOrderId}`}
                              className="form-select text-sm"
                              value={selected}
                              disabled={isAssigning}
                              onChange={(e) =>
                                setSelectedTechnician((prev) => ({
                                  ...prev,
                                  [workOrderId]: e.target.value,
                                }))
                              }
                            >
                              <option value="">{t("selectTechnicianPlaceholder")}</option>
                              {activeEmployees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {employeeName(emp)}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center justify-between gap-2">
                              <Button type="submit" size="sm" disabled={isAssigning || !selected}>
                                {isAssigning ? t("assigning") : t("assignTechnician")}
                              </Button>
                              <Link
                                href={`/work-orders/${workOrderId}`}
                                className="text-xs text-[var(--brand-accent)] hover:underline"
                              >
                                {t("viewDetails")}
                              </Link>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
