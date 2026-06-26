"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PriceBookItem } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { EstimateLineEditor, type DraftLine } from "@/components/estimating/estimate-line-editor";
import { useAppPage } from "@/lib/use-app-page";
import {
  estimateWizardStepPath,
  loadEstimateWizardDraft,
  saveEstimateWizardDraft,
} from "@/lib/estimating/wizard-steps";

export default function EstimateNewLinesPage() {
  const router = useRouter();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>([]);

  useEffect(() => {
    const draft = loadEstimateWizardDraft();
    if (!draft.title) {
      router.replace(estimateWizardStepPath("details"));
      return;
    }
    setLines(draft.lines.length > 0 ? draft.lines : [{ description: "", quantity: 1, unit_price_cents: 0 }]);
  }, [router]);

  useEffect(() => {
    if (token) client.listPriceBookItems().then((r) => setPriceBook(r.data ?? [])).catch(console.error);
  }, [token, client]);

  function onContinue() {
    const validLines = lines.filter((l) => l.description.trim());
    saveEstimateWizardDraft({
      ...loadEstimateWizardDraft(),
      lines: validLines,
    });
    router.push(estimateWizardStepPath("review"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tc("lineItems")}</CardTitle>
        <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("linesDescription")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <EstimateLineEditor lines={lines} onChange={setLines} priceBook={priceBook} />
        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <Link
            href={estimateWizardStepPath("details")}
            className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium transition hover:border-[var(--brand-accent)]"
          >
            {tc("back")}
          </Link>
          <Button onClick={onContinue}>{tc("reviewEstimate")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
