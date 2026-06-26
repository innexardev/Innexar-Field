import type { OnboardingStepId } from "./steps";

export interface OnboardingProfile {
  companyState: string;
  teamSize: string;
  logoUrl: string;
}

export interface OnboardingSetup {
  stripeSkipped: boolean;
  csvSkipped: boolean;
  inviteEmails: string[];
}

export interface OnboardingState {
  version: 1;
  currentStep: OnboardingStepId;
  completed: boolean;
  industryPacks: string[];
  profile: OnboardingProfile;
  modules: Record<string, boolean>;
  setup: OnboardingSetup;
}

export interface SignupSeed {
  company_name: string;
  industry_pack: string;
  plan_id?: string;
}
