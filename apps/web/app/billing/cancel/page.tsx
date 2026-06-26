"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";

export default function BillingCancelPage() {
  const t = useTranslations("billing.cancel");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-background-subtle)] p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("subtitle")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link
            href="/onboarding/billing"
            className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-medium text-[var(--brand-accent-foreground)]"
          >
            {t("tryAgain")}
          </Link>
          <Link
            href="/billing"
            className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)]"
          >
            {t("manageBilling")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
