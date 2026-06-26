"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { APBill } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle, IconReceipt } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function AccountsPayablePage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.accountsPayable");
  const tc = useTranslations("modules.common");
  const [bills, setBills] = useState<APBill[]>([]);

  useEffect(() => {
    if (token) client.listAPBills().then((r) => setBills(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const openBills = useMemo(() => bills.filter((b) => b.status === "open"), [bills]);
  const totalOpen = useMemo(
    () => openBills.reduce((sum, b) => sum + b.amount_cents, 0),
    [openBills],
  );

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {bills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconReceipt size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="stat-card">
              <CardContent className="py-4">
                <div className="text-sm text-[var(--brand-text-muted)]">Open bills</div>
                <div className="text-2xl font-bold">{openBills.length}</div>
              </CardContent>
            </Card>
            <Card className="stat-card">
              <CardContent className="py-4">
                <div className="text-sm text-[var(--brand-text-muted)]">Amount due</div>
                <div className="text-2xl font-bold">{formatCents(totalOpen)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vendor bills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bills.map((bill, i) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] px-3 py-3 stagger-item"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div>
                    <div className="font-medium">{bill.vendor_name}</div>
                    <div className="text-xs text-[var(--brand-text-muted)]">
                      {bill.bill_number}
                      {bill.due_date ? ` · Due ${bill.due_date}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="font-medium">{formatCents(bill.amount_cents)}</div>
                    <Badge tone={bill.status === "paid" ? "success" : bill.status === "open" ? "warning" : "default"}>
                      {bill.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </ModulePage>
  );
}
