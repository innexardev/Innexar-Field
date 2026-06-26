/** English group labels from @fieldforge/ui/nav-groups — keys for nav.* messages. */
export const NAV_GROUP_KEYS: Record<string, string> = {
  Sales: "sales",
  Operations: "operations",
  Finance: "finance",
  Workforce: "workforce",
  Other: "other",
};

export function translateNavGroupLabel(
  englishLabel: string,
  translate: (key: string) => string,
): string {
  const key = NAV_GROUP_KEYS[englishLabel];
  return key ? translate(key) : englishLabel;
}
