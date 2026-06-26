"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Estimate } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, IconFileText } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function EstimatesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.estimates");
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  useEffect(() => {
    if (token) client.listEstimates().then((r) => setEstimates(r.data ?? [])).catch(console.error);
  }, [token, client]);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("listDescription")}</p>
        <Link href="/estimates/new">
          <Button>{t("newEstimate")}</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {estimates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconFileText size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
            <Link href="/estimates/new" className="mt-4">
              <Button>{t("createEstimate")}</Button>
            </Link>
          </div>
        ) : (
          estimates.map((est, i) => (
            <Card
              key={est.id}
              className="list-item-card stagger-item transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <Link href={`/estimates/${est.id}`} className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--brand-text-primary)] hover:text-[var(--brand-accent)]">
                    {est.title}
                  </div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">{formatCents(est.total_cents)}</div>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={est.status === "accepted" ? "success" : "default"}>{est.status}</Badge>
                  <Link href={`/estimates/${est.id}/preview`}>
                    <Button variant="secondary" size="sm">{t("previewPdf")}</Button>
                  </Link>
                  <Link href={`/estimates/${est.id}`}>
                    <Button size="sm">{t("viewQuote")}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
