/**
 * Tipos gerados a partir de config/app.config.yaml
 * Em produção: gerar via script ou ler YAML em build time.
 */
export interface AppConfig {
  version: string;
  environment: "development" | "staging" | "production";
  brand: BrandConfig;
  pricing: PricingConfig;
  debug: DebugConfig;
  features: Record<string, boolean>;
  ux: UxConfig;
  contact: ContactConfig;
}

export interface BrandConfig {
  name: string;
  legal_name: string;
  tagline: string;
  description: string;
  domains: {
    marketing: string;
    app: string;
    api: string;
    docs: string;
  };
  colors: BrandColors;
  typography: {
    font_sans: string;
    font_mono: string;
    scale: "compact" | "comfortable" | "spacious";
  };
  logo: {
    light: string;
    dark: string;
    icon: string;
    favicon: string;
  };
  name_candidates: string[];
}

export interface BrandColors {
  primary: string;
  primary_foreground: string;
  accent: string;
  accent_foreground: string;
  accent_muted: string;
  background: string;
  background_subtle: string;
  surface: string;
  surface_elevated: string;
  border: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  success: string;
  success_subtle: string;
  warning: string;
  warning_subtle: string;
  error: string;
  error_subtle: string;
  info: string;
  info_subtle: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price_monthly: number | null;
  price_yearly: number | null;
  price_from?: number;
  stripe_price_id: string;
  description: string;
  badge: string | null;
  limits: Record<string, number | string>;
  modules: Record<string, boolean>;
  features: string[];
}

export interface PricingConfig {
  currency: string;
  billing_interval: string;
  trial_days: number;
  plans: Record<string, PricingPlan>;
  addons: Record<string, { name: string; price_monthly: number }>;
}

export interface DebugConfig {
  enabled: boolean;
  log_level: "trace" | "debug" | "info" | "warn" | "error";
  show_dev_panel: boolean;
  features: Record<string, boolean | number>;
  debug_tenants: string[];
}

export interface UxConfig {
  reduce_motion: boolean;
  default_locale: string;
  supported_locales: string[];
  date_format: string;
  time_format: "12h" | "24h";
  first_day_of_week: number;
}

export interface ContactConfig {
  support_email: string;
  sales_email: string;
  phone: string;
}

/** Helpers — uso no app */
export function isDebugEnabled(config: AppConfig): boolean {
  return config.debug.enabled;
}

export function isDebugFeature(config: AppConfig, feature: string): boolean {
  return config.debug.enabled && Boolean(config.debug.features[feature]);
}

export function getPlan(config: AppConfig, planId: string): PricingPlan | undefined {
  return config.pricing.plans[planId];
}

export function brandCssVars(colors: BrandColors): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [
      `--brand-${key.replace(/_/g, "-")}`,
      value,
    ]),
  );
}
