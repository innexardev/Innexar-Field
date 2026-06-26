"use client";

import { useTranslations } from "next-intl";
import {
  ESTIMATE_WIZARD_STEPS,
  type EstimateWizardStepId,
  estimateWizardStepIndex,
} from "@/lib/estimating/wizard-steps";

const STEP_LABEL_KEYS: Record<EstimateWizardStepId, "wizardStepDetails" | "wizardStepLines" | "wizardStepReview"> = {
  details: "wizardStepDetails",
  lines: "wizardStepLines",
  review: "wizardStepReview",
};

export function EstimateWizardStepper({ currentStep }: { currentStep: EstimateWizardStepId }) {
  const tc = useTranslations("modules.common");
  const currentIndex = estimateWizardStepIndex(currentStep);

  return (
    <nav aria-label={tc("wizardProgressAria")} className="onboarding-stepper">
      <ol className="onboarding-stepper__list">
        {ESTIMATE_WIZARD_STEPS.map((step, index) => {
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
                <span className="onboarding-stepper__label">{tc(STEP_LABEL_KEYS[step.id])}</span>
              </div>
              {index < ESTIMATE_WIZARD_STEPS.length - 1 && (
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
