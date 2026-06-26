"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ChangeOrder, Project } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconBuilding } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

export default function ChangeOrdersPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.changeOrders");
  const tc = useTranslations("modules.common");
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<ChangeOrder[]>([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!token) return;
    client.listProjects().then((r) => setProjects(r.data ?? [])).catch(console.error);
    client.listChangeOrders().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const co = await client.createChangeOrder({
      project_id: projectId,
      title,
      description: description || undefined,
      amount_cents: Math.round(parseFloat(amount || "0") * 100),
    });
    setItems((prev) => [co, ...prev]);
    setTitle("");
    setDescription("");
    setAmount("");
  }

  function updateItem(co: ChangeOrder) {
    setItems((prev) => prev.map((c) => (c.id === co.id ? co : c)));
  }

  async function onSubmitForApproval(id: string) {
    const co = await client.submitChangeOrder(id);
    updateItem(co);
  }

  async function onApprove(id: string) {
    const co = await client.approveChangeOrder(id);
    updateItem(co);
  }

  async function onReject(id: string) {
    const co = await client.rejectChangeOrder(id, rejectReason || undefined);
    updateItem(co);
    setRejectingId(null);
    setRejectReason("");
  }

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>New change order</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label">Project</label>
                <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add master bath tile" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
              <div className="form-field">
                <label className="form-label">Description</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" />
              </div>
              <div className="form-field">
                <label className="form-label">Amount ($)</label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconBuilding size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          items.map((co, i) => (
            <Card key={co.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{co.title}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {projectName(co.project_id)} · {formatCents(co.amount_cents)}
                  </div>
                  {co.description && (
                    <div className="mt-1 text-sm text-[var(--brand-text-muted)]">{co.description}</div>
                  )}
                  {co.rejection_reason && (
                    <div className="mt-1 text-sm text-[var(--brand-error)]">
                      Rejected: {co.rejection_reason}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={co.status === "approved" ? "success" : co.status === "rejected" ? "warning" : "default"}>
                    {STATUS_LABELS[co.status] ?? co.status}
                  </Badge>
                  {co.status === "draft" && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => onSubmitForApproval(co.id)}>
                      Submit for approval
                    </Button>
                  )}
                  {co.status === "pending" && (
                    <>
                      <Button type="button" size="sm" onClick={() => onApprove(co.id)}>
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setRejectingId(co.id)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
                {rejectingId === co.id && (
                  <div className="flex w-full flex-wrap items-end gap-2 border-t border-[var(--brand-border)] pt-3 sm:col-span-2">
                    <div className="form-field min-w-[200px] flex-1">
                      <label className="form-label">Rejection reason</label>
                      <Input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Optional reason"
                      />
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onReject(co.id)}>
                      Confirm reject
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRejectingId(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
