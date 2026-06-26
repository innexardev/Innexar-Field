"use client";

import { useTranslations } from "next-intl";
import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/onboarding/steps";

const STEP_KEYS: Record<OnboardingStepId, string> = {
  industry: "stepIndustry",
  profile: "stepProfile",
  modules: "stepModules",
  setup: "stepSetup",
  complete: "stepComplete",
};

export function OnboardingStepper({ currentStep }: { currentStep: OnboardingStepId }) {
  const t = useTranslations("onboarding");
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Onboarding progress" className="onboarding-stepper">
      <ol className="onboarding-stepper__list">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.id} className="onboarding-stepper__item">
              <div
                className={`onboarding-stepper__node${done ? " onboarding-stepper__node--done" : ""}${active ? " onboarding-stepper__node--active" : ""}`}
                aria-current={active ? "step" : undefined}
              >
                <span className="onboarding-stepper__bullet">
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="onboarding-stepper__label">{t(STEP_KEYS[step.id])}</span>
              </div>
              {index < ONBOARDING_STEPS.length - 1 && (
                <div
                  className={`onboarding-stepper__connector${done ? " onboarding-stepper__connector--done" : ""}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
