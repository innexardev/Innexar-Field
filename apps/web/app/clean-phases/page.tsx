"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { CleanPhase, Job } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconSparkles } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const PHASES = ["rough", "final", "premium"] as const;
const STATUSES = ["pending", "in_progress", "completed"] as const;

export default function CleanPhasesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.cleanPhases");
  const tc = useTranslations("modules.common");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [items, setItems] = useState<CleanPhase[]>([]);
  const [jobId, setJobId] = useState("");
  const [phase, setPhase] = useState<string>("final");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!token) return;
    client.listJobs().then((r) => setJobs(r.data ?? [])).catch(console.error);
    client.listCleanPhases().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId) return;
    const cp = await client.createCleanPhase({ job_id: jobId, phase, notes: notes || undefined });
    setItems((prev) => [cp, ...prev]);
    setNotes("");
  }

  async function updateStatus(id: string, status: string) {
    const data: { status: string; completed_at?: string } = { status };
    if (status === "completed") data.completed_at = new Date().toISOString();
    const cp = await client.updateCleanPhase(id, data);
    setItems((prev) => prev.map((p) => (p.id === id ? cp : p)));
  }

  const jobTitle = (id: string) => jobs.find((j) => j.id === id)?.title ?? id.slice(0, 8);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>Add clean phase</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-end">
            <div className="form-field">
              <label className="form-label">Job</label>
              <select className="form-select" value={jobId} onChange={(e) => setJobId(e.target.value)} required>
                <option value="">Select job</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Phase</label>
              <select className="form-select" value={phase} onChange={(e) => setPhase(e.target.value)}>
                {PHASES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
            <Button type="submit">Add phase</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconSparkles size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          items.map((cp, i) => (
            <Card key={cp.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium capitalize">{cp.phase} phase</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">{jobTitle(cp.job_id)}</div>
                  {cp.notes && <div className="mt-1 text-sm text-[var(--brand-text-muted)]">{cp.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={cp.status === "completed" ? "success" : "default"}>{cp.status}</Badge>
                  {cp.status !== "completed" && (
                    <select
                      className="form-select text-sm"
                      value={cp.status}
                      onChange={(e) => updateStatus(cp.id, e.target.value)}
                      aria-label="Update phase status"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
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
