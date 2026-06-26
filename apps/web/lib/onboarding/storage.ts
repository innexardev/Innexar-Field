import type {
  FieldForgeClient,
  OnboardingModulePreview,
  OnboardingStatus as ApiOnboardingStatus,
} from "@fieldforge/sdk";
import type { IndustryPack } from "@fieldforge/sdk";
import type { OnboardingState, SignupSeed } from "./types";
import { CORE_MODULES, defaultModulesForPacks } from "./modules";
import type { OnboardingStepId } from "./steps";

const STORAGE_KEY = "ff_onboarding";
const SIGNUP_SEED_KEY = "ff_onboarding_signup";

const DEFAULT_PROFILE = {
  companyState: "",
  teamSize: "1",
  logoUrl: "",
};

const DEFAULT_SETUP = {
  stripeSkipped: true,
  csvSkipped: true,
  inviteEmails: [] as string[],
};

const UI_STEPS: OnboardingStepId[] = ["billing", "industry", "profile", "modules", "setup", "complete"];

function defaultState(seed?: SignupSeed | null): OnboardingState {
  const industryPacks = seed?.industry_pack ? [seed.industry_pack] : ["field-services"];
  return {
    version: 1,
    currentStep: "billing",
    completed: false,
    industryPacks,
    profile: { ...DEFAULT_PROFILE },
    modules: defaultModulesForPacks([]),
    setup: { ...DEFAULT_SETUP, inviteEmails: [] },
  };
}

export function apiStepToLocal(step: string): OnboardingStepId {
  if (step === "signup") return "billing";
  return UI_STEPS.includes(step as OnboardingStepId) ? (step as OnboardingStepId) : "billing";
}

export function modulesArrayToRecord(modules: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const id of CORE_MODULES) out[id] = true;
  for (const id of modules) out[id] = true;
  return out;
}

export function modulesPreviewToRecord(preview: OnboardingModulePreview[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const m of preview) out[m.id] = m.enabled;
  for (const id of CORE_MODULES) out[id] = true;
  return out;
}

export function modulesRecordToArray(modules: Record<string, boolean>): string[] {
  return Object.entries(modules)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);
}

export function statusToState(
  status: ApiOnboardingStatus,
  fallback?: OnboardingState | null,
): OnboardingState {
  const base = fallback ?? defaultState(readSignupSeed());
  const apiModules = status.modules ?? [];
  const modules = apiModules.length ? modulesArrayToRecord(apiModules) : base.modules;
  const apiPacks = status.industry_packs ?? [];

  return {
    version: 1,
    currentStep: apiStepToLocal(status.step),
    completed: status.completed,
    industryPacks: apiPacks.length ? apiPacks : base.industryPacks,
    profile: {
      companyState: status.profile?.state ?? base.profile.companyState,
      teamSize: status.profile?.team_size ?? base.profile.teamSize,
      logoUrl: status.profile?.logo_url ?? base.profile.logoUrl,
    },
    modules,
    setup: {
      ...base.setup,
      stripeSkipped: status.setup_skipped ?? base.setup.stripeSkipped,
      csvSkipped: status.setup_skipped ?? base.setup.csvSkipped,
    },
  };
}

export function profileToApi(profile: OnboardingState["profile"]) {
  return {
    state: profile.companyState || undefined,
    team_size: profile.teamSize || undefined,
    logo_url: profile.logoUrl || undefined,
  };
}

export function saveSignupSeed(seed: SignupSeed): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIGNUP_SEED_KEY, JSON.stringify(seed));
}

export function readSignupSeed(): SignupSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SIGNUP_SEED_KEY);
    return raw ? (JSON.parse(raw) as SignupSeed) : null;
  } catch {
    return null;
  }
}

export function loadOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return defaultState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OnboardingState;
      if (parsed.version === 1) {
        return {
          ...parsed,
          industryPacks: parsed.industryPacks ?? [],
          setup: {
            ...parsed.setup,
            inviteEmails: parsed.setup?.inviteEmails ?? [],
          },
        };
      }
    }
  } catch {
    /* fall through */
  }
  const seed = readSignupSeed();
  const state = defaultState(seed);
  if (seed?.industry_pack) {
    state.industryPacks = [seed.industry_pack];
  }
  return state;
}

export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function applyOnboardingStatus(status: ApiOnboardingStatus): OnboardingState {
  const next = statusToState(status, loadOnboardingState());
  saveOnboardingState(next);
  return next;
}

export function mergeOnboardingState(
  current: OnboardingState,
  patch: Partial<OnboardingState>,
): OnboardingState {
  return { ...current, ...patch };
}

export function patchOnboardingState(patch: Partial<OnboardingState>): OnboardingState {
  const current = loadOnboardingState();
  const next = mergeOnboardingState(current, patch);
  saveOnboardingState(next);
  return next;
}

export function setOnboardingStep(step: OnboardingStepId): OnboardingState {
  return patchOnboardingState({ currentStep: step });
}

export function markOnboardingCompleteLocal(): OnboardingState {
  return patchOnboardingState({ completed: true, currentStep: "complete" });
}

export function mergeModulesFromPacks(
  current: OnboardingState,
  packs: IndustryPack[],
  selectedIds: string[],
): OnboardingState {
  const selected = packs.filter((p) => selectedIds.includes(p.id));
  const modules = defaultModulesForPacks(selected.map((p) => p.modules));
  const merged: Record<string, boolean> = { ...modules };
  for (const [id, enabled] of Object.entries(current.modules)) {
    if (!(id in merged) && enabled) merged[id] = enabled;
  }
  return mergeOnboardingState(current, { industryPacks: selectedIds, modules: merged });
}

export function syncModulesFromPacks(packs: IndustryPack[], selectedIds: string[]): OnboardingState {
  const next = mergeModulesFromPacks(loadOnboardingState(), packs, selectedIds);
  saveOnboardingState(next);
  return next;
}

export async function fetchOnboardingFromApi(
  client: FieldForgeClient,
): Promise<OnboardingState | null> {
  try {
    const status = await client.getOnboardingStatus();
    return statusToState(status, loadOnboardingState());
  } catch {
    return null;
  }
}

export async function persistIndustryToApi(
  client: FieldForgeClient,
  industryPacks: string[],
  pending: OnboardingState,
): Promise<OnboardingState> {
  const status = await client.saveOnboardingIndustry(industryPacks);
  const next = statusToState(status, pending);
  saveOnboardingState(next);
  return next;
}

export async function persistProfileToApi(
  client: FieldForgeClient,
  profile: OnboardingState["profile"],
  pending: OnboardingState,
): Promise<OnboardingState> {
  const status = await client.saveOnboardingProfile(profileToApi(profile));
  const next = statusToState(status, pending);
  saveOnboardingState(next);
  return next;
}

export async function fetchModulesPreviewFromApi(
  client: FieldForgeClient,
): Promise<OnboardingModulePreview[]> {
  try {
    const res = await client.previewOnboardingModules();
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function persistModulesToApi(
  client: FieldForgeClient,
  modules: Record<string, boolean>,
  pending: OnboardingState,
): Promise<OnboardingState> {
  const status = await client.updateOnboardingModules(modulesRecordToArray(modules));
  const next = statusToState(status, pending);
  saveOnboardingState(next);
  return next;
}

export async function persistSkipSetupToApi(
  client: FieldForgeClient,
  pending: OnboardingState,
): Promise<OnboardingState> {
  const status = await client.skipOnboardingSetup();
  const next = statusToState(status, pending);
  saveOnboardingState(next);
  return next;
}

export async function persistCompleteToApi(
  client: FieldForgeClient,
  pending: OnboardingState,
): Promise<{ state: OnboardingState; nav: import("@fieldforge/sdk").NavItem[] }> {
  const res = await client.completeOnboarding();
  const next = statusToState(res.onboarding, pending);
  saveOnboardingState(next);
  return { state: next, nav: res.nav?.data ?? [] };
}
