"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useBrand } from "@/components/brand-provider";
import {
  IconCheck,
  IconSparkles,
  IconUsers,
  IconFileText,
  IconCalendar,
  Button,
  Card,
  CardContent,
} from "@fieldforge/ui";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ErrorBanner } from "@/components/error-banner";
import { readSignupSeed } from "@/lib/onboarding/storage";
import { useOnboarding } from "@/lib/onboarding/use-onboarding";

const TOUR_STEPS = [
  { icon: IconUsers, label: "Add your first customer" },
  { icon: IconFileText, label: "Create an estimate and send as quote" },
  { icon: IconCalendar, label: "Schedule a job and invoice when complete" },
];

export default function OnboardingCompletePage() {
  const brand = useBrand();
  const router = useRouter();
  const { state, finish, saving, error } = useOnboarding();
  const seed = readSignupSeed();

  const started = useRef(false);

  const runFinish = useCallback(() => {
    void finish().catch(() => {
      /* error surfaced via hook */
    });
  }, [finish]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runFinish();
  }, [runFinish]);

  function goToDashboard(withTour: boolean) {
    router.push(withTour ? "/dashboard?tour=1" : "/dashboard");
  }

  const enabledModules = state ? Object.values(state.modules).filter(Boolean).length : 0;

  if (error) {
    return (
      <OnboardingShell step="complete">
        <div className="onboarding-content onboarding-content--narrow space-y-4">
          <header className="onboarding-page-header">
            <h1 className="onboarding-title">Could not finish onboarding</h1>
            <p className="onboarding-subtitle">
              Your progress is saved on the server. Check your connection and try again.
            </p>
          </header>
          <ErrorBanner message={error} />
          <Button onClick={runFinish} disabled={saving}>
            {saving ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  if (!state?.completed) {
    return (
      <OnboardingShell step="complete">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-accent)]"
            role="status"
            aria-label="Completing onboarding"
          />
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step="complete">
      <div className="onboarding-content onboarding-content--narrow">
        <div className="onboarding-celebration">
          <div className="onboarding-celebration__icon" aria-hidden>
            <IconSparkles size={40} />
          </div>
          <h1 className="onboarding-title onboarding-title--center">
            Welcome to {brand.name}
            {seed?.company_name ? `, ${seed.company_name}` : ""}!
          </h1>
          <p className="onboarding-subtitle onboarding-subtitle--center">
            Your workspace is ready with {enabledModules} modules provisioned. You&apos;re all set to run your field
            operations from day one.
          </p>
        </div>

        <Card className="onboarding-complete-card">
          <CardContent className="space-y-4 py-6">
            <div className="flex items-center gap-3 rounded-xl bg-[var(--brand-success-subtle)] px-4 py-3 text-[var(--brand-success)]">
              <IconCheck size={22} />
              <span className="font-medium">Onboarding complete</span>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--brand-text-primary)]">Suggested first steps</h2>
              <ol className="mt-3 space-y-3">
                {TOUR_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.label} className="flex items-center gap-3 text-sm stagger-item" style={{ animationDelay: `${i * 80}ms` }}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-surface-elevated)] text-[var(--brand-accent)]">
                        <Icon size={16} />
                      </span>
                      <span className="text-[var(--brand-text-secondary)]">{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button onClick={() => goToDashboard(true)} className="flex-1">
                Start guided tour
              </Button>
              <Button variant="secondary" onClick={() => goToDashboard(false)} className="flex-1">
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </OnboardingShell>
  );
}
