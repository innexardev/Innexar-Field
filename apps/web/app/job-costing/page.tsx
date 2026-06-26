"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { JobCostLine } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, IconChart } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function JobCostingPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.jobCosting");
  const tc = useTranslations("modules.common");
  const [items, setItems] = useState<JobCostLine[]>([]);
  const [jobId, setJobId] = useState("");
  const [budget, setBudget] = useState("");
  const [actual, setActual] = useState("");

  useEffect(() => {
    if (token) client.listJobCosts().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const line = await client.createJobCost({
      job_id: jobId,
      budget_cents: Math.round(parseFloat(budget) * 100),
      actual_cents: Math.round(parseFloat(actual || "0") * 100),
      cost_code: "labor",
      description: "Cost line",
    });
    setItems((prev) => [line, ...prev]);
    setJobId("");
    setBudget("");
    setActual("");
  }

  const totalBudget = items.reduce((s, l) => s + l.budget_cents, 0);
  const totalActual = items.reduce((s, l) => s + l.actual_cents, 0);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="stat-card"><CardContent className="py-4"><div className="text-sm text-[var(--brand-text-muted)]">Lines</div><div className="text-2xl font-bold">{items.length}</div></CardContent></Card>
        <Card className="stat-card"><CardContent className="py-4"><div className="text-sm text-[var(--brand-text-muted)]">Total budget</div><div className="text-2xl font-bold">{formatCents(totalBudget)}</div></CardContent></Card>
        <Card className="stat-card"><CardContent className="py-4"><div className="text-sm text-[var(--brand-text-muted)]">Total actual</div><div className="text-2xl font-bold">{formatCents(totalActual)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Add cost line</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-4 sm:items-end">
            <div className="form-field sm:col-span-2">
              <label className="form-label">Job ID</label>
              <Input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="UUID from Jobs" required />
            </div>
            <div className="form-field">
              <label className="form-label">Budget ($)</label>
              <Input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="form-label">Actual ($)</label>
              <Input type="number" step="0.01" value={actual} onChange={(e) => setActual(e.target.value)} />
            </div>
            <Button type="submit" className="sm:col-span-4 sm:w-auto">Add line</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconChart size={28} className="text-[var(--brand-text-muted)]" /></div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          </div>
        ) : (
          items.map((line, i) => (
            <Card key={line.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex justify-between py-4 text-sm">
                <div>
                  <div className="font-medium">{line.cost_code} — {line.description || "Cost line"}</div>
                  <div className="text-[var(--brand-text-secondary)]">Job {line.job_id.slice(0, 8)}…</div>
                </div>
                <div className="text-right">
                  <div>Budget {formatCents(line.budget_cents)}</div>
                  <div>Actual {formatCents(line.actual_cents)}</div>
                  <div className={line.variance_cents >= 0 ? "text-[var(--brand-success)]" : "text-[var(--brand-error)]"}>
                    Variance {formatCents(line.variance_cents)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
