"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Customer } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { EstimateLineEditor } from "@/components/estimating/estimate-line-editor";
import { useAppPage } from "@/lib/use-app-page";
import {
  clearEstimateWizardDraft,
  estimateWizardStepPath,
  loadEstimateWizardDraft,
} from "@/lib/estimating/wizard-steps";

export default function EstimateNewReviewPage() {
  const router = useRouter();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [draft, setDraft] = useState(loadEstimateWizardDraft());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loaded = loadEstimateWizardDraft();
    if (!loaded.title) {
      router.replace(estimateWizardStepPath("details"));
      return;
    }
    setDraft(loaded);
  }, [router]);

  useEffect(() => {
    if (token) client.listCustomers().then((r) => setCustomers(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const customerName = customers.find((c) => c.id === draft.customerId)?.name;

  async function onCreate(sendAfter: boolean) {
    setCreating(true);
    setError("");
    try {
      const est = await client.createEstimate({
        title: draft.title,
        customer_id: draft.customerId || undefined,
        lines: draft.lines,
      });
      clearEstimateWizardDraft();
      if (sendAfter) {
        await client.sendEstimate(est.id);
      }
      router.push(`/estimates/${est.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failedToCreate"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reviewTitle")}</CardTitle>
        <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("reviewDescription")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--brand-text-muted)]">{tc("title")}</dt>
            <dd className="font-medium">{draft.title}</dd>
          </div>
          <div>
            <dt className="text-[var(--brand-text-muted)]">{tc("customer")}</dt>
            <dd className="font-medium">{customerName ?? "—"}</dd>
          </div>
        </dl>

        <EstimateLineEditor lines={draft.lines} onChange={() => undefined} readOnly />

        {error && <p className="form-error">{error}</p>}

        <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--brand-border)] pt-4">
          <Link
            href={estimateWizardStepPath("lines")}
            className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium transition hover:border-[var(--brand-accent)]"
          >
            {tc("back")}
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={creating} onClick={() => void onCreate(false)}>
              {creating ? tc("saving") : tc("saveAsDraft")}
            </Button>
            <Button disabled={creating || draft.lines.length === 0} onClick={() => void onCreate(true)}>
              {creating ? tc("sending") : tc("createAndSendQuote")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
