"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { useBrand } from "@/components/brand-provider";
import { BrandLogo } from "@fieldforge/ui";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { useAuth } from "@/lib/auth-context";
import type { OnboardingStepId } from "@/lib/onboarding/steps";

export function OnboardingShell({
  step,
  children,
}: {
  step: OnboardingStepId;
  children: React.ReactNode;
}) {
  const brand = useBrand();
  const t = useTranslations("onboarding");
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="onboarding-layout">
      <header className="onboarding-header">
        <BrandLogo
          src={brand.logo.wordmark}
          alt={brand.name}
          height={32}
          className="onboarding-header__brand"
        />
        <div className="flex items-center gap-3">
          <p className="onboarding-header__tagline">{t("setupWorkspace")}</p>
          <LanguageSwitcher variant="compact" />
        </div>
      </header>
      <div className="onboarding-stepper-wrap">
        <OnboardingStepper currentStep={step} />
      </div>
      <main className="onboarding-main page-enter" key={step}>
        {children}
      </main>
    </div>
  );
}
