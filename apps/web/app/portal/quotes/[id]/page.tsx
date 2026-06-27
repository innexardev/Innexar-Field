"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { PortalQuoteDetail } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { PortalPage } from "@/components/portal-page";
import { usePortalPage } from "@/lib/use-portal-page";
import { formatCents } from "@/lib/use-app-page";

export default function PortalQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("modules.portal.quotes");
  const tc = useTranslations("modules.common");
  const locale = useLocale();
  const { client } = usePortalPage();
  const [quote, setQuote] = useState<PortalQuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!params.id) return;
    setQuote(await client.getQuote(params.id));
  }, [client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  async function acceptQuote() {
    if (!quote) return;
    setAccepting(true);
    setError("");
    try {
      await client.acceptQuote(quote.id);
      setNotice(t("acceptedNotice"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("error"));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <PortalPage title={quote?.title ?? t("detailTitle")} subtitle={t("detailSubtitle")}>
      <ErrorBanner message={error} />
      {notice ? (
        <div className="mb-4 rounded-lg border border-[var(--brand-success)] bg-[var(--brand-success-subtle)] px-4 py-3 text-sm">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{tc("loading")}</p>
      ) : !quote ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("notFound")}</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>{t("summaryTitle")}</CardTitle>
              <Badge tone={quote.status === "accepted" ? "success" : "default"}>
                {t(`status.${quote.status}`, { defaultValue: quote.status })}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--brand-text-secondary)]">{t("subtotal")}</span>
                <span>{formatCents(quote.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t("total")}</span>
                <span>{formatCents(quote.total_cents)}</span>
              </div>
              <div className="text-xs text-[var(--brand-text-muted)]">
                {t("createdAt", { date: new Date(quote.created_at).toLocaleDateString(locale) })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("linesTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--brand-border)]">
              {quote.lines.map((line) => (
                <div
                  key={`${line.description}-${line.unit_price_cents}`}
                  className="flex justify-between gap-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{line.description}</div>
                    <div className="text-[var(--brand-text-secondary)]">
                      {line.quantity} × {formatCents(line.unit_price_cents)}
                    </div>
                  </div>
                  <div className="font-medium">
                    {formatCents(Math.round(line.quantity * line.unit_price_cents))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {quote.status === "sent" ? (
            <Button onClick={() => void acceptQuote()} disabled={accepting}>
              {accepting ? t("accepting") : t("accept")}
            </Button>
          ) : null}
        </div>
      )}
    </PortalPage>
  );
}
