"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkOrder } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconTruck } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

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

export default function WorkOrdersPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.workOrders");
  const tc = useTranslations("modules.common");
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");

  useEffect(() => {
    if (token) client.listWorkOrders().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const wo = await client.createWorkOrder({ title, priority });
    setItems((prev) => [wo, ...prev]);
    setTitle("");
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>{t("newTitle")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="wo-title">{tc("title")}</label>
              <Input id="wo-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="wo-priority">{tc("priority")}</label>
              <select id="wo-priority" className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">{tc("low")}</option>
                <option value="normal">{tc("normal")}</option>
                <option value="high">{tc("high")}</option>
                <option value="urgent">{tc("urgent")}</option>
              </select>
            </div>
            <Button type="submit">{tc("create")}</Button>
          </form>
          <p className="mt-3 text-sm text-[var(--brand-text-secondary)]">{t("afterCreateHint")}</p>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconTruck size={28} className="text-[var(--brand-text-muted)]" /></div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          items.map((wo, i) => (
            <Card key={wo.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/work-orders/${wo.id}`} className="font-medium hover:text-[var(--brand-accent)]">
                    {wo.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--brand-text-secondary)]">
                    <Badge tone={priorityTone(wo.priority)}>{wo.priority}</Badge>
                    <span>{statusLabel(wo.status)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone(wo.status)}>{wo.status}</Badge>
                  <Link href={`/work-orders/${wo.id}`}>
                    <Button variant="secondary" size="sm">{t("viewDetails")}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
