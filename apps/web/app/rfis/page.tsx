"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Project, RFI } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconFileText } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function RFIsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.rfis");
  const tc = useTranslations("modules.common");
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<RFI[]>([]);
  const [projectId, setProjectId] = useState("");
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");

  useEffect(() => {
    if (!token) return;
    client.listProjects().then((r) => setProjects(r.data ?? [])).catch(console.error);
    client.listRFIs().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !subject) return;
    const rfi = await client.createRFI({
      project_id: projectId,
      subject,
      question: question || undefined,
    });
    setItems((prev) => [rfi, ...prev]);
    setSubject("");
    setQuestion("");
  }

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>New RFI</CardTitle></CardHeader>
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
                <label className="form-label">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Clarify beam size at grid B-4" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="form-field">
                <label className="form-label">Question</label>
                <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Detail the required W-section per structural drawings" />
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
              <IconFileText size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          items.map((rfi, i) => (
            <Card key={rfi.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{rfi.subject}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">{projectName(rfi.project_id)}</div>
                  {rfi.question && (
                    <div className="mt-1 text-sm text-[var(--brand-text-muted)]">{rfi.question}</div>
                  )}
                </div>
                <Badge tone={rfi.status === "answered" ? "success" : "default"}>{rfi.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
