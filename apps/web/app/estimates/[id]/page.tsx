"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { EstimateDetail, PriceBookItem } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { EstimateLineEditor, type DraftLine } from "@/components/estimating/estimate-line-editor";
import { EstimatePropertyPicker } from "@/components/estimating/estimate-property-picker";
import { ModulePage } from "@/components/module-page";
import { downloadDocumentBlob } from "@/lib/download-document";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function EstimateDetailPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const est = await client.getEstimate(params.id);
    setEstimate(est);
    setLines(
      est.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price_cents: l.unit_price_cents,
      })),
    );
    setDirty(false);
  }, [token, client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (token) client.listPriceBookItems().then((r) => setPriceBook(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const isDraft = estimate?.status === "draft";

  async function saveProperty(propertyId: string) {
    if (!estimate) return;
    setSavingProperty(true);
    try {
      const updated = await client.updateEstimate(estimate.id, { property_id: propertyId });
      setEstimate(updated);
    } finally {
      setSavingProperty(false);
    }
  }

  async function saveLines() {
    if (!estimate) return;
    setSaving(true);
    try {
      const updated = await client.updateEstimate(estimate.id, {
        lines: lines.filter((l) => l.description.trim()),
      });
      setEstimate(updated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function sendQuote() {
    if (!estimate) return;
    setActing(true);
    try {
      if (dirty) await saveLines();
      const updated = await client.sendEstimate(estimate.id);
      setEstimate(updated);
    } finally {
      setActing(false);
    }
  }

  async function acceptQuote() {
    if (!estimate) return;
    setActing(true);
    try {
      await client.acceptEstimate(estimate.id);
      await load();
    } finally {
      setActing(false);
    }
  }

  async function downloadPdf() {
    if (!estimate) return;
    setDownloading(true);
    try {
      const blob = await client.downloadEstimatePdf(estimate.id);
      await downloadDocumentBlob(blob, estimate.title);
    } finally {
      setDownloading(false);
    }
  }

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

  return (
    <ModulePage
      title={estimate.title}
      subtitle={t("detailSubtitle")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => void downloadPdf()} disabled={downloading}>
            {downloading ? tc("loading") : t("downloadPdf")}
          </Button>
          <Link href={`/estimates/${estimate.id}/preview`}>
            <Button variant="secondary">{t("previewPdf")}</Button>
          </Link>
          <Link href={`/estimates/${estimate.id}/calculate`}>
            <Button>{tc("calculate")}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/estimates" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("allEstimates")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={estimate.status === "accepted" ? "success" : "default"}>{estimate.status}</Badge>
          {isDraft && (
            <>
              <Button variant="secondary" onClick={() => void saveLines()} disabled={saving || !dirty}>
                {saving ? tc("saving") : tc("saveLines")}
              </Button>
              <Button onClick={sendQuote} disabled={acting}>
                {acting ? tc("sending") : tc("sendQuote")}
              </Button>
            </>
          )}
          {estimate.status === "sent" && (
            <>
              {estimate.public_token && (
                <a
                  href={`/p/${estimate.public_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-sm font-medium transition hover:border-[var(--brand-accent)]"
                >
                  {tc("clientPortalLink")}
                </a>
              )}
              <Button onClick={acceptQuote} disabled={acting}>
                {acting ? tc("accepting") : tc("markAccepted")}
              </Button>
            </>
          )}
        </div>
      </div>

      {estimate.customer_id && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="form-field max-w-xl">
              <label className="form-label" htmlFor="est-property-detail">
                {t("propertyOptional")}
              </label>
              <EstimatePropertyPicker
                client={client}
                token={token}
                customerId={estimate.customer_id}
                propertyId={estimate.property_id ?? ""}
                onPropertyIdChange={(nextId) => void saveProperty(nextId)}
                disabled={!isDraft || savingProperty}
                selectId="est-property-detail"
              />
              <p className="form-hint">{t("propertyHint")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))] bg-[var(--brand-info-subtle)]">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <p className="text-sm text-[var(--brand-text-secondary)]">
            {t("previewSubtitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/estimates/${estimate.id}/preview`}>
              <Button variant="secondary">{t("viewQuote")}</Button>
            </Link>
            <Link href={`/estimates/${estimate.id}/calculate`}>
              <Button>{tc("calculate")}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{tc("lineItems")}</CardTitle>
            {!isDraft && (
              <p className="text-sm text-[var(--brand-text-secondary)]">{t("lineItemsLocked")}</p>
            )}
          </CardHeader>
          <CardContent>
            <EstimateLineEditor
              lines={lines}
              onChange={(next) => {
                setLines(next);
                setDirty(true);
              }}
              priceBook={isDraft ? priceBook : []}
              readOnly={!isDraft}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tc("summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--brand-text-muted)]">{tc("subtotal")}</span>
              <span>{formatCents(estimate.subtotal_cents)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--brand-border)] pt-3 text-base font-semibold">
              <span>{tc("total")}</span>
              <span>{formatCents(estimate.total_cents)}</span>
            </div>
            {estimate.customer_id && (
              <Link
                href={`/customers/${estimate.customer_id}`}
                className="mt-4 block w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-center text-sm font-medium transition hover:border-[var(--brand-accent)]"
              >
                {tc("viewCustomer")}
              </Link>
            )}
            <Link href={`/estimates/${estimate.id}/calculate`} className="block">
              <Button className="mt-2 w-full">{tc("calculate")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
