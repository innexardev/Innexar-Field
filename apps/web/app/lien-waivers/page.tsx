"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { LienWaiver, Project } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconFileText } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function LienWaiversPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.lienWaivers");
  const tc = useTranslations("modules.common");
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<LienWaiver[]>([]);
  const [projectId, setProjectId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [waiverType, setWaiverType] = useState("conditional");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!token) return;
    client.listProjects().then((r) => setProjects(r.data ?? [])).catch(console.error);
    client.listLienWaivers().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !partyName) return;
    const waiver = await client.createLienWaiver({
      project_id: projectId,
      party_name: partyName,
      waiver_type: waiverType,
      amount_cents: Math.round(parseFloat(amount || "0") * 100),
    });
    setItems((prev) => [waiver, ...prev]);
    setPartyName("");
    setAmount("");
  }

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>New lien waiver</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_140px_120px_auto] lg:items-end">
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
              <label className="form-label">Party name</label>
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="ABC Electric LLC" required />
            </div>
            <div className="form-field">
              <label className="form-label">Type</label>
              <select className="form-select" value={waiverType} onChange={(e) => setWaiverType(e.target.value)}>
                <option value="conditional">Conditional</option>
                <option value="unconditional">Unconditional</option>
                <option value="partial">Partial</option>
                <option value="final">Final</option>
              </select>
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
              <IconFileText size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          items.map((lw, i) => (
            <Card key={lw.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{lw.party_name}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {projectName(lw.project_id)} · {lw.waiver_type} · {formatCents(lw.amount_cents)}
                  </div>
                </div>
                <Badge tone={lw.status === "signed" ? "success" : "default"}>{lw.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
