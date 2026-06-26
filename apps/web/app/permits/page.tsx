"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Permit, Project } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconShield } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function PermitsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.permits");
  const tc = useTranslations("modules.common");
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Permit[]>([]);
  const [projectId, setProjectId] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [permitType, setPermitType] = useState("building");
  const [jurisdiction, setJurisdiction] = useState("");

  useEffect(() => {
    if (!token) return;
    client.listProjects().then((r) => setProjects(r.data ?? [])).catch(console.error);
    client.listPermits().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const permit = await client.createPermit({
      project_id: projectId,
      permit_number: permitNumber || undefined,
      permit_type: permitType,
      jurisdiction: jurisdiction || undefined,
    });
    setItems((prev) => [permit, ...prev]);
    setPermitNumber("");
    setJurisdiction("");
  }

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>New permit</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_140px_1fr_auto] lg:items-end">
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
              <label className="form-label">Permit number</label>
              <Input value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} placeholder="BP-2026-001" />
            </div>
            <div className="form-field">
              <label className="form-label">Type</label>
              <select className="form-select" value={permitType} onChange={(e) => setPermitType(e.target.value)}>
                <option value="building">Building</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="mechanical">Mechanical</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Jurisdiction</label>
              <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="City of Austin" />
            </div>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconShield size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          items.map((pm, i) => (
            <Card key={pm.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">
                    {pm.permit_number || pm.permit_type}
                  </div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {projectName(pm.project_id)}
                    {pm.jurisdiction ? ` · ${pm.jurisdiction}` : ""}
                  </div>
                </div>
                <Badge tone={pm.status === "approved" ? "success" : "default"}>{pm.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
