"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ChartOfAccount } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconChart } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

const TYPE_LABELS: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expense",
};

export default function ChartOfAccountsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.chartOfAccounts");
  const tc = useTranslations("modules.common");
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);

  useEffect(() => {
    if (token) client.listChartOfAccounts().then((r) => setAccounts(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance_cents, 0),
    [accounts],
  );

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconChart size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="stat-card max-w-xs">
            <CardContent className="py-4">
              <div className="text-sm text-[var(--brand-text-muted)]">Accounts</div>
              <div className="text-2xl font-bold">{accounts.length}</div>
              <div className="mt-1 text-xs text-[var(--brand-text-secondary)]">
                Net balance {formatCents(totalBalance)}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {accounts.map((account, i) => (
              <Card key={account.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <div className="font-medium">
                      {account.account_number} — {account.name}
                    </div>
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {TYPE_LABELS[account.account_type] ?? account.account_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="font-medium">{formatCents(account.balance_cents)}</div>
                    <Badge tone={account.is_active ? "success" : "default"}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
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
