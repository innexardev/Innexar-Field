import type { IndustryPack } from "@fieldforge/sdk";

/** Extended packs shown in UI; modules resolved locally until API adds them. */
export const EXTENDED_INDUSTRY_PACKS: IndustryPack[] = [
  {
    id: "property-maintenance",
    name: "Property Maintenance",
    description: "Facility management, landscaping, and recurring service contracts",
    modules: ["crm", "scheduling", "invoicing", "dispatch", "expenses"],
  },
  {
    id: "multi-service",
    name: "Multi-Service",
    description: "Mixed trades — customize modules in the next step",
    modules: ["crm", "estimating", "scheduling", "invoicing", "expenses", "dispatch"],
  },
];

export function mergeIndustryPacks(apiPacks: IndustryPack[] | null | undefined): IndustryPack[] {
  const merged = [...(apiPacks ?? [])].map((pack) => ({
    ...pack,
    modules: pack.modules ?? [],
  }));
  for (const ext of EXTENDED_INDUSTRY_PACKS) {
    if (!merged.some((p) => p.id === ext.id)) merged.push(ext);
  }
  return merged;
}
