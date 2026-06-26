"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ModulePage } from "@/components/module-page";
import type { EstimateWizardStepId } from "@/lib/estimating/wizard-steps";
import { EstimateWizardStepper } from "@/components/estimating/estimate-wizard-stepper";

function stepFromPath(pathname: string): EstimateWizardStepId {
  if (pathname.endsWith("/review")) return "review";
  if (pathname.endsWith("/lines")) return "lines";
  return "details";
}

export default function EstimateNewLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const step = stepFromPath(pathname);
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");

  return (
    <ModulePage title={t("newEstimate")} subtitle={t("wizardSubtitle")}>
      <Link href="/estimates" className="mb-6 inline-block text-sm text-[var(--brand-accent)] hover:underline">
        {tc("allEstimates")}
      </Link>
      <div className="onboarding-stepper-wrap mb-8">
        <EstimateWizardStepper currentStep={step} />
      </div>
      <div className="max-w-3xl page-enter">{children}</div>
    </ModulePage>
  );
}
