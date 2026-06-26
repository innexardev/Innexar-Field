"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PortalDocument } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconFileText } from "@fieldforge/ui";
import { PortalPage } from "@/components/portal-page";
import { formatCents } from "@/lib/use-app-page";
import { usePortalPage } from "@/lib/use-portal-page";

export default function PortalDocumentsPage() {
  const t = useTranslations("modules.portal.documents");
  const tc = useTranslations("modules.common");
  const { customer, client } = usePortalPage();
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .listPortalDocuments()
      .then((r) => setDocuments(r.data ?? []))
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
      ) : documents.length === 0 ? (
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
          {documents.map((doc, i) => (
            <Card
              key={`${doc.kind}-${doc.id}`}
              className="list-item-card stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{doc.title}</span>
                    <Badge tone="default">{t(`kind.${doc.kind}`)}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                    {formatCents(doc.amount_cents)}
                  </div>
                  {doc.created_at ? (
                    <div className="text-xs text-[var(--brand-text-muted)]">
                      {t("createdAt", { date: new Date(doc.created_at).toLocaleDateString() })}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={doc.status === "accepted" || doc.status === "active" ? "success" : "default"}>
                    {doc.status}
                  </Badge>
                  {doc.view_url.startsWith("/p/") ? (
                    <Link
                      href={doc.view_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--brand-accent)] hover:underline"
                    >
                      {t("view")}
                    </Link>
                  ) : (
                    <span className="text-sm text-[var(--brand-text-muted)]">{t("contractOnFile")}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
