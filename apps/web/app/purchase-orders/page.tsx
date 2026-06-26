"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { PurchaseOrder } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconTruck } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

const STATUS_TONE: Record<string, "default" | "warning" | "success"> = {
  draft: "default",
  sent: "warning",
  received: "success",
};

export default function PurchaseOrdersPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.purchaseOrders");
  const tc = useTranslations("modules.common");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    if (token) client.listPurchaseOrders().then((r) => setOrders(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const openOrders = useMemo(
    () => orders.filter((o) => o.status !== "received"),
    [orders],
  );
  const openTotal = useMemo(
    () => openOrders.reduce((sum, o) => sum + o.amount_cents, 0),
    [openOrders],
  );

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconTruck size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="stat-card">
              <CardContent className="py-4">
                <div className="text-sm text-[var(--brand-text-muted)]">Open POs</div>
                <div className="text-2xl font-bold">{openOrders.length}</div>
              </CardContent>
            </Card>
            <Card className="stat-card">
              <CardContent className="py-4">
                <div className="text-sm text-[var(--brand-text-muted)]">Committed spend</div>
                <div className="text-2xl font-bold">{formatCents(openTotal)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {orders.map((order, i) => (
              <Card key={order.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <div className="font-medium">
                      {order.po_number} — {order.vendor_name}
                    </div>
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {order.job_id ? `Job ${order.job_id.slice(0, 8)}…` : "No job linked"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="font-medium">{formatCents(order.amount_cents)}</div>
                    <Badge tone={STATUS_TONE[order.status] ?? "default"}>{order.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </ModulePage>
  );
}
