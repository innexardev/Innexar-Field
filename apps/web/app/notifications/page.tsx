"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Notification } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconShield } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

function categoryTone(category: string): "default" | "success" | "warning" {
  if (category === "billing") return "warning";
  if (category === "operations") return "success";
  return "default";
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function NotificationsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.notifications");
  const tc = useTranslations("modules.common");
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (token) client.listNotifications().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconShield size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--brand-text-muted)]">
            {unread > 0 ? `${unread} unread` : "All read"}
          </p>
          {items.map((n, i) => (
            <Card
              key={n.id}
              className={`list-item-card stagger-item${n.read ? "" : " border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))]"}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--brand-text-primary)]">{n.title}</span>
                    <Badge tone={categoryTone(n.category)}>{n.category}</Badge>
                    {!n.read && <Badge tone="warning">New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{n.body}</p>
                  <p className="mt-2 text-xs text-[var(--brand-text-muted)]">{formatWhen(n.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
