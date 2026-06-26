"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatErrorForUser } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { useAuth } from "@/lib/auth-context";
import { applyOnboardingStatus, readSignupSeed } from "@/lib/onboarding/storage";
import { nextStep, stepPath } from "@/lib/onboarding/steps";

function BillingSuccessContent() {
  const t = useTranslations("billing.success");
  const { client } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const fromOnboarding = params.get("from") === "onboarding";
  const isMock = params.get("mock") === "true";
  const planId = params.get("plan_id") ?? readSignupSeed()?.plan_id;

  useEffect(() => {
    let cancelled = false;

    async function finalize() {
      try {
        if (isMock) {
          await client.completeMockCheckout(planId ?? undefined);
        }
        if (fromOnboarding) {
          const status = await client.completeOnboardingBilling();
          applyOnboardingStatus(status);
        }
        if (!cancelled) setDone(true);
      } catch (err) {
        if (!cancelled) setError(formatErrorForUser(err));
      }
    }

    void finalize();
    return () => {
      cancelled = true;
    };
  }, [client, fromOnboarding, isMock, planId]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => {
      if (fromOnboarding) {
        const next = nextStep("billing");
        router.replace(next ? stepPath(next) : "/dashboard");
        return;
      }
      router.replace("/billing");
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [done, fromOnboarding, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-background-subtle)] p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{done ? t("title") : t("processing")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <ErrorBanner message={error} />
          ) : (
            <p className="text-sm text-[var(--brand-text-secondary)]">
              {done ? t("subtitle") : t("wait")}
            </p>
          )}
          {done && (
            <Button className="w-full" onClick={() => router.replace(fromOnboarding ? stepPath("industry") : "/billing")}>
              {t("continue")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingSuccessPage() {
  const t = useTranslations("billing.success");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--brand-text-secondary)]">
          {t("processing")}
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}
