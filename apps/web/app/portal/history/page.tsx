"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PortalHistoryItem } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconCalendar } from "@fieldforge/ui";
import { PortalPage } from "@/components/portal-page";
import { usePortalPage } from "@/lib/use-portal-page";

function historyTone(status: string): "success" | "warning" | "default" {
  if (status === "completed") return "success";
  if (status === "cancelled") return "warning";
  return "default";
}

export default function PortalHistoryPage() {
  const t = useTranslations("modules.portal.history");
  const tc = useTranslations("modules.common");
  const locale = useLocale();
  const { customer, client } = usePortalPage();
  const [items, setItems] = useState<PortalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .listHistory()
      .then((r) => setItems(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [client]);

  function formatWhen(item: PortalHistoryItem) {
    const iso = item.completed_at ?? item.scheduled_at;
    if (!iso) return t("dateUnknown");
    return new Date(iso).toLocaleString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <PortalPage
      title={t("title")}
      subtitle={customer ? t("subtitle", { name: customer.name }) : t("loadingSubtitle")}
    >
      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{tc("loading")}</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconCalendar size={28} className="text-[var(--brand-text-muted)]" />
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
          {items.map((item, i) => (
            <Card
              key={item.id}
              className="list-item-card stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {t("servicedAt", { date: formatWhen(item) })}
                  </div>
                  {item.notes ? (
                    <div className="mt-1 text-xs text-[var(--brand-text-muted)]">{item.notes}</div>
                  ) : null}
                </div>
                <Badge tone={historyTone(item.status)}>
                  {t(`status.${item.status}`, { defaultValue: item.status })}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
