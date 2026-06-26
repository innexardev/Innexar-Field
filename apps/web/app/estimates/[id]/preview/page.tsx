"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { EstimateDetail } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";
import { useBrand } from "@/components/brand-provider";

export default function EstimatePreviewPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const brand = useBrand();
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const est = await client.getEstimate(params.id);
    setEstimate(est);
  }, [token, client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <ModulePage title={tc("estimate")} subtitle={tc("loading")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!estimate) {
    return (
      <ModulePage title={tc("estimate")} subtitle={tc("notFound")}>
        <Link href="/estimates" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToEstimates")}
        </Link>
      </ModulePage>
    );
  }

  const statusTone = estimate.status === "accepted" ? "success" : "default";

  return (
    <ModulePage
      title={estimate.title}
      subtitle={t("previewSubtitle")}
      actions={
        <div className="quote-preview-actions flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            {t("printQuote")}
          </Button>
          <Link href={`/estimates/${estimate.id}`}>
            <Button variant="secondary">{tc("backToEstimate")}</Button>
          </Link>
        </div>
      }
    >
      <div className="quote-preview mb-6">
        <Card className="shadow-lg">
          <CardHeader className="border-b border-[var(--brand-border)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
                  {brand.name}
                </p>
                <CardTitle className="mt-1 text-2xl">{estimate.title}</CardTitle>
              </div>
              <Badge tone={statusTone}>{estimate.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {estimate.lines.length === 0 ? (
              <p className="text-sm text-[var(--brand-text-secondary)]">{tc("noLineItemsYet")}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--brand-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-left text-[var(--brand-text-muted)]">
                      <th className="px-4 py-3 font-medium">{tc("description")}</th>
                      <th className="px-4 py-3 font-medium">{tc("qty")}</th>
                      <th className="px-4 py-3 font-medium">{tc("unitUsd")}</th>
                      <th className="px-4 py-3 text-right font-medium">{tc("total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.lines.map((line) => {
                      const lineTotal = Math.round(line.quantity * line.unit_price_cents);
                      return (
                        <tr key={line.id} className="border-b border-[var(--brand-border)] last:border-0">
                          <td className="px-4 py-3">{line.description}</td>
                          <td className="px-4 py-3">{line.quantity}</td>
                          <td className="px-4 py-3">{formatCents(line.unit_price_cents)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCents(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-xl bg-[var(--brand-surface-elevated)] p-5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-text-muted)]">{tc("subtotal")}</span>
                <span>{formatCents(estimate.subtotal_cents)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-[var(--brand-border)] pt-3 text-lg font-semibold">
                <span>{tc("total")}</span>
                <span>{formatCents(estimate.total_cents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
