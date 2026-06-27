"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ARAging } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconCreditCard } from "@fieldforge/ui";
import { ModuleDisabledState } from "@/components/module-disabled-state";
import { ModulePage } from "@/components/module-page";
import { usePluginEnabled } from "@/lib/use-plugin-access";
import { useAppPage, formatCents } from "@/lib/use-app-page";

const BUCKET_LABELS: Record<string, string> = {
  current: "Current",
  "30": "1–30 days",
  "60": "31–60 days",
  "90": "61–90 days",
  "90+": "90+ days",
};

const BUCKET_ORDER = ["current", "30", "60", "90", "90+"];

export default function AccountsReceivablePage() {
  const { client, token } = useAppPage();
  const accountingEnabled = usePluginEnabled("accounting");
  const t = useTranslations("modules.accountsReceivable");
  const [items, setItems] = useState<ARAging[]>([]);

  useEffect(() => {
    if (!token || !accountingEnabled) return;
    client.listARAging().then((r) => setItems(r.data ?? [])).catch(() => setItems([]));
  }, [token, client, accountingEnabled]);

  const totalOutstanding = useMemo(
    () => items.reduce((sum, item) => sum + item.amount_cents, 0),
    [items],
  );

  const byBucket = useMemo(() => {
    const map = new Map<string, ARAging[]>();
    for (const item of items) {
      const list = map.get(item.aging_bucket) ?? [];
      list.push(item);
      map.set(item.aging_bucket, list);
    }
    return map;
  }, [items]);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {!accountingEnabled ? (
        <ModuleDisabledState
          moduleName={t("title")}
          icon={<IconCreditCard size={28} className="text-[var(--brand-text-muted)]" />}
        />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconCreditCard size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Card className="stat-card max-w-xs">
            <CardContent className="py-4">
              <div className="text-sm text-[var(--brand-text-muted)]">Total outstanding</div>
              <div className="text-2xl font-bold">{formatCents(totalOutstanding)}</div>
              <div className="mt-1 text-xs text-[var(--brand-text-secondary)]">
                {items.length} open balance{items.length !== 1 ? "s" : ""}
              </div>
            </CardContent>
          </Card>

          {BUCKET_ORDER.filter((bucket) => byBucket.has(bucket)).map((bucket) => {
            const bucketItems = byBucket.get(bucket) ?? [];
            const bucketTotal = bucketItems.reduce((sum, item) => sum + item.amount_cents, 0);
            return (
              <section key={bucket}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--brand-text-primary)]">
                    {BUCKET_LABELS[bucket] ?? bucket}
                  </h2>
                  <span className="text-sm text-[var(--brand-text-muted)]">{formatCents(bucketTotal)}</span>
                </div>
                <Card>
                  <CardContent className="space-y-3 pt-6">
                    {bucketItems.map((item, i) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-[var(--brand-surface-elevated)] px-3 py-3 stagger-item"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div>
                          <div className="font-medium">{item.customer_name}</div>
                          <div className="text-xs text-[var(--brand-text-muted)]">
                            {item.invoice_number} · {item.days_outstanding} days
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{formatCents(item.amount_cents)}</div>
                          <Badge tone={bucket === "current" ? "success" : "warning"}>
                            {BUCKET_LABELS[item.aging_bucket] ?? item.aging_bucket}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </ModulePage>
  );
}
