export const ONBOARDING_STEPS = [
  { id: "billing", path: "/onboarding/billing", label: "Billing", shortLabel: "Billing" },
  { id: "industry", path: "/onboarding/industry", label: "Industry", shortLabel: "Industry" },
  { id: "profile", path: "/onboarding/profile", label: "Company profile", shortLabel: "Company" },
  { id: "modules", path: "/onboarding/modules", label: "Modules", shortLabel: "Modules" },
  { id: "setup", path: "/onboarding/setup", label: "Quick setup", shortLabel: "Setup" },
  { id: "complete", path: "/onboarding/complete", label: "Complete", shortLabel: "Done" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export function stepPath(id: OnboardingStepId): string {
  return ONBOARDING_STEPS.find((s) => s.id === id)!.path;
}

export function stepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}

export function nextStep(id: OnboardingStepId): OnboardingStepId | null {
  const i = stepIndex(id);
  return i < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[i + 1]!.id : null;
}

export function prevStep(id: OnboardingStepId): OnboardingStepId | null {
  const i = stepIndex(id);
  return i > 0 ? ONBOARDING_STEPS[i - 1]!.id : null;
}
