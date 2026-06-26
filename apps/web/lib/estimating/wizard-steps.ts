export const ESTIMATE_WIZARD_STEPS = [
  { id: "details", label: "Details", shortLabel: "Details", path: "/estimates/new" },
  { id: "lines", label: "Line items", shortLabel: "Lines", path: "/estimates/new/lines" },
  { id: "review", label: "Review", shortLabel: "Review", path: "/estimates/new/review" },
] as const;

export type EstimateWizardStepId = (typeof ESTIMATE_WIZARD_STEPS)[number]["id"];

export function estimateWizardStepIndex(step: EstimateWizardStepId) {
  return ESTIMATE_WIZARD_STEPS.findIndex((s) => s.id === step);
}

export function nextEstimateWizardStep(step: EstimateWizardStepId): EstimateWizardStepId | null {
  const idx = estimateWizardStepIndex(step);
  if (idx < 0 || idx >= ESTIMATE_WIZARD_STEPS.length - 1) return null;
  return ESTIMATE_WIZARD_STEPS[idx + 1].id;
}

export function prevEstimateWizardStep(step: EstimateWizardStepId): EstimateWizardStepId | null {
  const idx = estimateWizardStepIndex(step);
  if (idx <= 0) return null;
  return ESTIMATE_WIZARD_STEPS[idx - 1].id;
}

export function estimateWizardStepPath(step: EstimateWizardStepId) {
  return ESTIMATE_WIZARD_STEPS.find((s) => s.id === step)?.path ?? "/estimates/new";
}

export const ESTIMATE_WIZARD_STORAGE_KEY = "fieldforge.estimate-wizard";

export interface EstimateWizardDraft {
  title: string;
  customerId: string;
  propertyId: string;
  lines: { description: string; quantity: number; unit_price_cents: number }[];
}

export function loadEstimateWizardDraft(): EstimateWizardDraft {
  if (typeof window === "undefined") {
    return { title: "", customerId: "", propertyId: "", lines: [] };
  }
  try {
    const raw = sessionStorage.getItem(ESTIMATE_WIZARD_STORAGE_KEY);
    if (!raw) return { title: "", customerId: "", propertyId: "", lines: [] };
    const parsed = JSON.parse(raw) as Partial<EstimateWizardDraft>;
    return {
      title: parsed.title ?? "",
      customerId: parsed.customerId ?? "",
      propertyId: parsed.propertyId ?? "",
      lines: parsed.lines ?? [],
    };
  } catch {
    return { title: "", customerId: "", propertyId: "", lines: [] };
  }
}

export function saveEstimateWizardDraft(draft: EstimateWizardDraft) {
  sessionStorage.setItem(ESTIMATE_WIZARD_STORAGE_KEY, JSON.stringify(draft));
}

export function clearEstimateWizardDraft() {
  sessionStorage.removeItem(ESTIMATE_WIZARD_STORAGE_KEY);
}
