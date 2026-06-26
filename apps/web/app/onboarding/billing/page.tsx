"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatErrorForUser } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { useConfig } from "@/components/brand-provider";
import { useAuth } from "@/lib/auth-context";
import { readSignupSeed } from "@/lib/onboarding/storage";
import { nextStep, stepPath } from "@/lib/onboarding/steps";

function orderedPlans(plans: Record<string, { id: string; name: string; price_monthly: number | null }>) {
  const order = ["starter", "business", "pro", "enterprise"];
  const list = Object.values(plans);
  return [...order.map((id) => plans[id]).filter(Boolean), ...list.filter((p) => !order.includes(p.id))];
}

export default function OnboardingBillingPage() {
  const t = useTranslations("billing.onboarding");
  const { pricing } = useConfig();
  const { client } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const seed = readSignupSeed();
  const planId = seed?.plan_id ?? "starter";
  const planList = orderedPlans(pricing.plans);
  const plan = planList.find((p) => p.id === planId) ?? planList[0];

  useEffect(() => {
    let cancelled = false;
    void client
      .getBillingStatus()
      .then((status) => {
        if (cancelled) return;
        if (!status.requires_payment) {
          const next = nextStep("billing");
          router.replace(next ? stepPath(next) : "/dashboard");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, router]);

  async function startCheckout() {
    setLoading(true);
    setError("");
    try {
      const origin = window.location.origin;
      const session = await client.createCheckout({
        plan_id: planId,
        success_url: `${origin}/billing/success?from=onboarding`,
        cancel_url: `${origin}/onboarding/billing`,
      });
      if (session.checkout_url) {
        window.location.href = session.checkout_url;
      }
    } catch (err) {
      setError(formatErrorForUser(err));
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <OnboardingShell step="billing">
        <div className="mx-auto max-w-lg py-16 text-center text-sm text-[var(--brand-text-secondary)]">
          {t("checking")}
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step="billing">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--brand-text-primary)]">{t("title")}</h1>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{plan?.name ?? planId}</CardTitle>
            <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
              {plan?.price_monthly != null
                ? t("pricePerMonth", { price: plan.price_monthly })
                : t("customPricing")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--brand-text-secondary)]">{t("secureCheckout")}</p>
            <ErrorBanner message={error} />
            <Button onClick={startCheckout} disabled={loading} className="w-full">
              {loading ? t("redirecting") : t("subscribe")}
            </Button>
            <p className="text-xs text-[var(--brand-text-muted)]">{t("applePayNote")}</p>
          </CardContent>
        </Card>
      </div>
    </OnboardingShell>
  );
}
