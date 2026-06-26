"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { EstimateCalculateResult, EstimateDetail } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function EstimateCalculatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null);
  const [result, setResult] = useState<EstimateCalculateResult | null>(null);
  const [markup, setMarkup] = useState("10");
  const [tax, setTax] = useState("0");
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [sending, setSending] = useState(false);

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

  const property = estimate?.property;
  const hasRoomCounts =
    property?.bedrooms != null &&
    property?.bathrooms != null &&
    property.bedrooms > 0 &&
    property.bathrooms > 0;

  async function onCalculate() {
    if (!estimate) return;
    setCalculating(true);
    try {
      const calc = await client.calculateEstimate(estimate.id, {
        markup_percent: parseFloat(markup) || 0,
        tax_percent: parseFloat(tax) || 0,
      });
      setResult(calc);
      await load();
    } finally {
      setCalculating(false);
    }
  }

  async function sendQuote() {
    if (!estimate) return;
    setSending(true);
    try {
      await client.sendEstimate(estimate.id);
      router.push(`/estimates/${estimate.id}`);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <ModulePage title={tc("calculate")} subtitle={tc("loading")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!estimate) {
    return (
      <ModulePage title={tc("calculate")} subtitle={tc("notFound")}>
        <Link href="/estimates" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToEstimates")}
        </Link>
      </ModulePage>
    );
  }

  const display = result ?? {
    subtotal_cents: estimate.subtotal_cents,
    markup_cents: 0,
    tax_cents: 0,
    total_cents: estimate.total_cents,
    markup_percent: 0,
    tax_percent: 0,
  };

  return (
    <ModulePage title={t("calculateTitle")} subtitle={t("calculateSubtitle", { title: estimate.title })}>
      <div className="mb-6">
        <Link href={`/estimates/${estimate.id}`} className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToEstimate")}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("pricingInputs")}</CardTitle>
            <p className="text-sm text-[var(--brand-text-secondary)]">{t("pricingInputsDescription")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {estimate.property_id && (
              <p className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 py-2 text-sm text-[var(--brand-text-secondary)]">
                {hasRoomCounts
                  ? t("roomTierHint", {
                      label: property?.label ?? "",
                      beds: property?.bedrooms ?? 0,
                      baths: property?.bathrooms ?? 0,
                    })
                  : t("roomTierMissingHint")}
              </p>
            )}
            <div className="form-field">
              <label className="form-label" htmlFor="markup">
                {t("markupPercent")}
              </label>
              <Input
                id="markup"
                type="number"
                min="0"
                step="0.1"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="tax">
                {t("taxPercent")}
              </label>
              <Input
                id="tax"
                type="number"
                min="0"
                step="0.1"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
              <p className="form-hint">{t("taxHint")}</p>
            </div>
            <Button onClick={() => void onCalculate()} disabled={calculating}>
              {calculating ? tc("calculating") : t("recalculateTotals")}
            </Button>
            {result?.room_tiers_applied && result.tier_lines_updated != null && result.tier_lines_updated > 0 && (
              <p className="text-sm text-[var(--brand-text-secondary)]">
                {t("roomTiersApplied", { count: result.tier_lines_updated })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{t("breakdown")}</CardTitle>
              <Badge>{estimate.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--brand-text-muted)]">{t("subtotalLines")}</span>
              <span>{formatCents(display.subtotal_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--brand-text-muted)]">{t("markupLine", { percent: display.markup_percent })}</span>
              <span>{formatCents(display.markup_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--brand-text-muted)]">{t("taxLine", { percent: display.tax_percent })}</span>
              <span>{formatCents(display.tax_cents)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--brand-border)] pt-3 text-base font-semibold">
              <span>{tc("total")}</span>
              <span>{formatCents(display.total_cents)}</span>
            </div>

            {estimate.status === "draft" && (
              <Button className="mt-4 w-full" onClick={() => void sendQuote()} disabled={sending}>
                {sending ? tc("sending") : t("sendQuoteToCustomer")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {estimate.lines.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{tc("lineItems")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--brand-border)] text-left text-[var(--brand-text-muted)]">
                    <th className="pb-2 font-medium">{tc("description")}</th>
                    <th className="pb-2 font-medium">{tc("qty")}</th>
                    <th className="pb-2 font-medium">{tc("unit")}</th>
                    <th className="pb-2 text-right font-medium">{tc("total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.lines.map((line) => (
                    <tr key={line.id} className="border-b border-[var(--brand-border)] last:border-0">
                      <td className="py-3 pr-4">{line.description}</td>
                      <td className="py-3 pr-4">{line.quantity}</td>
                      <td className="py-3 pr-4">{formatCents(line.unit_price_cents)}</td>
                      <td className="py-3 text-right font-medium">
                        {formatCents(Math.round(line.quantity * line.unit_price_cents))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </ModulePage>
  );
}
