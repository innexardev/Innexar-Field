"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useConfig } from "@/components/brand-provider";
import { useAppPage } from "@/lib/use-app-page";

function orderedPlans(plans: Record<string, { id: string; name: string; stripe_price_id: string }>) {
  const order = ["starter", "business", "pro", "enterprise"];
  const list = Object.values(plans);
  return [...order.map((id) => plans[id]).filter(Boolean), ...list.filter((p) => !order.includes(p.id))];
}

export default function SettingsBillingPage() {
  const t = useTranslations("billing.settings");
  const { pricing } = useConfig();
  useAppPage();
  const planList = orderedPlans(pricing.plans);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("plansTitle")}</CardTitle>
            <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("plansHint")}</p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-[var(--brand-border)]">
              {planList.map((plan) => (
                <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-[var(--brand-text-muted)]">ID: {plan.id}</p>
                  </div>
                  <code className="rounded bg-[var(--brand-surface-elevated)] px-2 py-1 text-xs">
                    {plan.stripe_price_id || t("notConfigured")}
                  </code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <p className="text-sm text-[var(--brand-text-secondary)]">
          {t("envHint")}{" "}
          <Link href="/billing" className="text-[var(--brand-accent)] hover:underline">
            {t("backToBilling")}
          </Link>
        </p>
      </div>
    </ModulePage>
  );
}
