"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, Input } from "@fieldforge/ui";
import { MobileModulePage } from "@/components/mobile-module-page";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@fieldforge/platform";
import { enqueueExpense, postOrEnqueue } from "@/lib/mobile/offline-queue";

export default function MobileExpensesPage() {
  const { token, client } = useAuth();
  const t = useTranslations("modules.mobileExpenses");
  const tc = useTranslations("modules.common");
  const { isOnline } = usePlatform();
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [jobId, setJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!description.trim() || Number.isNaN(cents) || cents <= 0) return;

    setSubmitting(true);
    setQueued(false);
    setError(null);

    const body = {
      description: description.trim(),
      amount_cents: cents,
      category: "field",
      ...(jobId.trim() ? { job_id: jobId.trim() } : {}),
    };

    try {
      if (isOnline) {
        try {
          await client.createExpense(body);
        } catch (submitErr) {
          const message = submitErr instanceof Error ? submitErr.message : "Failed to save expense";
          enqueueExpense(body, "failed", message);
          setQueued(true);
          setError(message);
          return;
        }
      } else {
        const result = await postOrEnqueue({
          path: "/expenses/expenses",
          body,
          label: `Expense: ${body.description}`,
          kind: "expense",
          isOnline: false,
        });
        if (result.queued) setQueued(true);
      }

      setDescription("");
      setAmount("");
      setJobId("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card className="mobile-detail-card">
        <CardContent>
          <div className="mobile-photo-placeholder" role="img" aria-label="Receipt photo placeholder">
            <span className="mobile-photo-placeholder__icon">📷</span>
            <p className="mobile-photo-placeholder__text">Snap a receipt</p>
            <p className="mobile-photo-placeholder__hint">Camera + OCR sync when online</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mobile-detail-card">
        <CardContent>
          <form onSubmit={(event) => void onSubmit(event)} className="mobile-form">
            <label className="mobile-form__label" htmlFor="expense-desc">
              Description
            </label>
            <Input
              id="expense-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Fuel, supplies…"
              required
            />
            <label className="mobile-form__label" htmlFor="expense-amount">
              Amount (USD)
            </label>
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="45.00"
              required
            />
            <label className="mobile-form__label" htmlFor="expense-job">
              Job ID (optional)
            </label>
            <Input
              id="expense-job"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              placeholder="Link to today's job"
            />
            <div className="mobile-sync-status__row">
              <span>Connection</span>
              <Badge tone={isOnline ? "success" : "warning"}>{isOnline ? "Online" : "Offline"}</Badge>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isOnline ? "Log expense" : "Queue expense"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {queued && (
        <p className="mobile-queued-hint">
          Expense queued — will sync when back online. Check <a href="/m/sync">Sync</a>.
        </p>
      )}
      {error && <p className="mobile-queue-item__error">{error}</p>}
    </MobileModulePage>
  );
}
