"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { PortalQuote } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconFileText } from "@fieldforge/ui";
import { PortalPage } from "@/components/portal-page";
import { usePortalPage } from "@/lib/use-portal-page";
import { formatCents } from "@/lib/use-app-page";

function quoteTone(status: string): "success" | "warning" | "default" {
  if (status === "accepted") return "success";
  if (status === "rejected") return "warning";
  return "default";
}

export default function PortalQuotesPage() {
  const t = useTranslations("modules.portal.quotes");
  const tc = useTranslations("modules.common");
  const locale = useLocale();
  const { customer, client } = usePortalPage();
  const [quotes, setQuotes] = useState<PortalQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .listQuotes()
      .then((r) => setQuotes(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [client]);

  return (
    <PortalPage
      title={t("title")}
      subtitle={customer ? t("subtitle", { name: customer.name }) : t("loadingSubtitle")}
    >
      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{tc("loading")}</p>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconFileText size={28} className="text-[var(--brand-text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
              <p className="mt-2 max-w-md text-sm text-[var(--brand-text-secondary)]">
                {t("emptyDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote, i) => (
            <Link key={quote.id} href={`/portal/quotes/${quote.id}`}>
              <Card
                className="list-item-card stagger-item transition hover:border-[var(--brand-accent)]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{quote.title}</div>
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {formatCents(quote.total_cents)} ·{" "}
                      {new Date(quote.created_at).toLocaleDateString(locale)}
                    </div>
                  </div>
                  <Badge tone={quoteTone(quote.status)}>
                    {t(`status.${quote.status}`, { defaultValue: quote.status })}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
