"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Milestone, Project } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconBuilding } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function MilestonesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.milestones");
  const tc = useTranslations("modules.common");
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Milestone[]>([]);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("0");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!token) return;
    client.listProjects().then((r) => setProjects(r.data ?? [])).catch(console.error);
    client.listMilestones().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const ms = await client.createMilestone({
      project_id: projectId,
      name,
      percent_complete: parseInt(percent, 10) || 0,
      amount_cents: Math.round(parseFloat(amount || "0") * 100),
    });
    setItems((prev) => [ms, ...prev]);
    setName("");
    setPercent("0");
    setAmount("");
  }

  async function markCompleted(id: string) {
    const ms = await client.updateMilestone(id, {
      status: "completed",
      percent_complete: 100,
      completed_at: new Date().toISOString(),
    });
    setItems((prev) => prev.map((m) => (m.id === id ? ms : m)));
  }

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>New milestone</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_100px_120px_auto] lg:items-end">
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
              <label className="form-label">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Framing complete" required />
            </div>
            <div className="form-field">
              <label className="form-label">Percent</label>
              <Input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Amount ($)</label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button type="submit">Create</Button>
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
          items.map((ms, i) => (
            <Card key={ms.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{ms.name}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {projectName(ms.project_id)} · {ms.percent_complete}% · {formatCents(ms.amount_cents)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={ms.status === "completed" ? "success" : "default"}>{ms.status}</Badge>
                  {ms.status !== "completed" && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => markCompleted(ms.id)}>
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
