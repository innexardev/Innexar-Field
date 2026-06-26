/** Client-safe defaults aligned with config/app.config.yaml (no node:fs). */
export const BRAND_NAME = "Innexar Field";
export const BRAND_SHORT_NAME = "Innexar";

export const DEFAULT_COLORS = {
  primary: "#0F172A",
  accent: "#2563EB",
};

export const DEFAULT_LOGO_WORDMARK = "/brand/innexarfield.svg";
export const DEFAULT_LOGO_ICON = "/brand/ifavicon.svg";
/** @deprecated Use DEFAULT_LOGO_WORDMARK — kept for admin config logo_url default */
export const DEFAULT_LOGO_URL = DEFAULT_LOGO_WORDMARK;
export const DEFAULT_SUPPORT_EMAIL = "support@field.innexar.app";

export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  onboarding_wizard: true,
  client_portal: true,
  marketplace_plugins: false,
  ai_estimate_suggestions: false,
  background_gps: false,
};
