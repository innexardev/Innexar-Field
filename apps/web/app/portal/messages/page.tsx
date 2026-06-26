"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PortalMessageThread } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconSparkles } from "@fieldforge/ui";
import { PortalPage } from "@/components/portal-page";
import { usePortalPage } from "@/lib/use-portal-page";

function threadTone(status: string): "success" | "warning" | "default" {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "in_progress") return "warning";
  return "default";
}

export default function PortalMessagesPage() {
  const t = useTranslations("modules.portal.messages");
  const tc = useTranslations("modules.common");
  const { customer, client } = usePortalPage();
  const [threads, setThreads] = useState<PortalMessageThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .listPortalMessages()
      .then((r) => setThreads(r.data ?? []))
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
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconSparkles size={28} className="text-[var(--brand-text-muted)]" />
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
          {threads.map((thread, i) => (
            <Card
              key={thread.id}
              className="list-item-card stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{thread.subject}</div>
                  <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{thread.preview}</p>
                  <div className="mt-2 text-xs text-[var(--brand-text-muted)]">
                    {t("updatedAt", { date: new Date(thread.updated_at).toLocaleString() })}
                  </div>
                </div>
                <Badge tone={threadTone(thread.status)}>
                  {t(`status.${thread.status}`, { defaultValue: thread.status })}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
