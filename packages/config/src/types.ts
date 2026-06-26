/**
 * Tipos gerados a partir de config/app.config.yaml
 * Em produção: gerar via script ou ler YAML em build time.
 */
export interface MobileCapacitorSplashConfig {
  launch_show_duration_ms: number;
  background_color: string;
  show_spinner?: boolean;
}

export interface MobileCapacitorDeepLinksConfig {
  path_prefix: string;
  jobs_path: string;
}

export interface MobileCapacitorConfig {
  splash: MobileCapacitorSplashConfig;
  deep_links: MobileCapacitorDeepLinksConfig;
}

export interface MobileConfig {
  capacitor: MobileCapacitorConfig;
}

export interface I18nConfig {
  default_locale: string;
  locales: string[];
}

export interface AppConfig {
  version: string;
  environment: "development" | "staging" | "production";
  brand: BrandConfig;
  pricing: PricingConfig;
  debug: DebugConfig;
  features: Record<string, boolean>;
  integrations?: Record<string, IntegrationConfig>;
  i18n?: I18nConfig;
  ux: UxConfig;
  mobile?: MobileConfig;
  contact: ContactConfig;
}

export interface BrandConfig {
  name: string;
  short_name: string;
  legal_name: string;
  tagline: string;
  description: string;
  domains: {
    marketing: string;
    app: string;
    api: string;
    admin: string;
    docs: string;
  };
  colors: BrandColors;
  typography: {
    font_sans: string;
    font_mono: string;
    scale: "compact" | "comfortable" | "spacious";
  };
  logo: {
    wordmark: string;
    icon: string;
    favicon: string;
    /** @deprecated Use wordmark — kept for legacy YAML overrides */
    light?: string;
    dark?: string;
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

export interface IntegrationOAuthConfig {
  authorize_url: string;
  scopes: string[];
}

export interface IntegrationConfig {
  id: string;
  name: string;
  enabled: boolean;
  category: string;
  description: string;
  plans?: string[];
  oauth?: IntegrationOAuthConfig;
  mock_rate_percent?: number;
  onboarding_return_path?: string;
}

export interface IntegrationConnectionStatus {
  integration_id: string;
  status: "disconnected" | "pending" | "connected";
  external_id?: string;
  metadata?: Record<string, unknown>;
  connected_at?: string;
  updated_at: string;
}

export interface AvalaraTaxResult {
  amount_cents: number;
  tax_cents: number;
  total_cents: number;
  rate_percent: number;
  jurisdiction: string;
  mock?: boolean;
  tax_pending?: boolean;
  provider: string;
  integration_id: string;
}

export interface StripeConnectOnboardResult {
  onboarding_url: string;
  account_id: string;
  mock?: boolean;
}

export interface StripeConnectStatus {
  integration_id: string;
  status: string;
  account_id?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  mock?: boolean;
}

export interface QuickBooksOAuthStart {
  authorize_url: string;
  state: string;
  mock?: boolean;
}

/** Helpers — uso no app */
export function isDebugEnabled(config: AppConfig): boolean {
  return config.debug.enabled;
}

export function isDebugFeature(config: AppConfig, feature: string): boolean {
  return config.debug.enabled && Boolean(config.debug.features[feature]);
}

export function isIntegrationMockMode(config: AppConfig, integrationId: string): boolean {
  switch (integrationId) {
    case "quickbooks":
      return isDebugFeature(config, "mock_quickbooks");
    case "avalara":
      return isDebugFeature(config, "mock_avalara");
    case "stripe_connect":
      return isDebugFeature(config, "mock_stripe");
    default:
      return false;
  }
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

/** Capacitor bundle id from app subdomain (e.g. app.field.innexar.app → app.field.innexar.app). */
export function brandAppId(appDomain: string): string {
  return appDomain.split(".").filter(Boolean).reverse().join(".");
}

/** iOS URL scheme from brand name (e.g. Innexar Field → InnexarField). */
export function brandUrlScheme(brandName: string): string {
  return brandName.replace(/[^a-zA-Z0-9]/g, "");
}

function iconMimeType(path: string): string {
  return path.endsWith(".svg") ? "image/svg+xml" : "image/png";
}

/** Next.js metadata.icons — favicon paths are identical across app public folders. */
export function brandMetadataIcons(brand: BrandConfig) {
  const favicon = brand.logo.favicon;
  const icon = brand.logo.icon || favicon;
  return {
    icon: [
      { url: favicon, type: iconMimeType(favicon) },
      { url: icon, type: iconMimeType(icon) },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: favicon,
  };
}
