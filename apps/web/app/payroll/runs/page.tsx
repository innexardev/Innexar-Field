"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { PayrollRun } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconCreditCard } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

const STATUS_TONES: Record<string, "default" | "warning" | "success"> = {
  draft: "default",
  processing: "warning",
  completed: "success",
};

function defaultPeriodEnd() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function defaultPeriodStart() {
  const d = new Date();
  d.setDate(d.getDate() - 13);
  return d.toISOString().slice(0, 10);
}

export default function PayrollRunsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.payrollRuns");
  const tc = useTranslations("modules.common");
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [creating, setCreating] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) client.listPayrollRuns().then((r) => setRuns(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const run = await client.createPayrollRun({
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
      });
      setRuns((prev) => [run, ...prev]);
    } finally {
      setCreating(false);
    }
  }

  async function onSubmitRun(id: string) {
    setSubmittingId(id);
    try {
      const run = await client.submitPayrollRun(id);
      setRuns((prev) => prev.map((r) => (r.id === id ? run : r)));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>New payroll run</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            Create a draft run for a pay period. Submit to calculate gross from approved timesheets.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="period-start">
                Pay period start
              </label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="period-end">
                Pay period end
              </label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create run"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {runs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconCreditCard size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          runs.map((run, i) => (
            <Card key={run.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">
                    {run.pay_period_start} — {run.pay_period_end}
                  </div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {run.employee_count} employees · {formatCents(run.total_gross_cents)} gross
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONES[run.status] ?? "default"}>{run.status}</Badge>
                  {run.status === "draft" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={submittingId === run.id}
                      onClick={() => onSubmitRun(run.id)}
                    >
                      {submittingId === run.id ? "Submitting…" : "Submit"}
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
