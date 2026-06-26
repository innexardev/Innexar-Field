import { parseApiError, parseFetchError } from "./errors";

export interface PlatformAdmin {
  id: string;
  email: string;
  role?: string;
}

export interface PlatformAuthResponse {
  token: string;
  admin: PlatformAdmin;
}

export interface PlatformPlan {
  id: string;
  name: string;
  description: string;
  price_monthly_cents?: number | null;
  stripe_price_id?: string;
  features: unknown;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformPlanInput {
  id: string;
  name: string;
  description?: string;
  price_monthly_cents?: number | null;
  stripe_price_id?: string;
  features?: unknown;
  active?: boolean;
  sort_order?: number;
}

export interface PlatformPromotion {
  id: string;
  code: string;
  description: string;
  discount_percent?: number | null;
  discount_cents?: number | null;
  plan_id?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  max_redemptions?: number | null;
  redemption_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformPromotionInput {
  code: string;
  description?: string;
  discount_percent?: number | null;
  discount_cents?: number | null;
  plan_id?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  max_redemptions?: number | null;
  active?: boolean;
}

export interface LandingContentBlock {
  id: string;
  section: "hero" | "features" | "pricing" | "footer" | string;
  block_key: string;
  content: Record<string, unknown>;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LandingContentInput {
  section: string;
  block_key?: string;
  content?: Record<string, unknown>;
  active?: boolean;
  sort_order?: number;
}

export interface PlatformTenant {
  id: string;
  slug: string;
  name: string;
  industry_pack: string;
  plan_id: string;
  subscription_status: string;
  suspended_at?: string | null;
  created_at: string;
}

export interface PlatformTenantPatch {
  suspended?: boolean;
  plan_id?: string;
  name?: string;
  industry_pack?: string;
  subscription_status?: string;
}

export interface PlatformTenantCreateInput {
  name: string;
  slug?: string;
  industry_pack?: string;
  plan_id?: string;
  subscription_status?: string;
  owner_email?: string;
  owner_password?: string;
}

export interface PlatformUser {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  tenant_slug?: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface PlatformUserCreateInput {
  tenant_id: string;
  email: string;
  password: string;
  role?: string;
  first_name?: string;
  last_name?: string;
}

export interface PlatformUserUpdateInput {
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
}

export interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  signups_last_30_days: number;
  tenants_by_plan: Record<string, number>;
  total_plans: number;
  active_promotions: number;
}

export interface PlatformMetrics {
  total_tenants: number;
  active_subscriptions: number;
  trialing: number;
  past_due: number;
  churned: number;
  suspended_tenants: number;
  mrr_estimate_cents: number;
  signups_last_7_days: number;
  signups_last_30_days: number;
  total_users: number;
  tenants_by_plan: Record<string, number>;
  subscription_by_status: Record<string, number>;
  recent_tenants: PlatformTenant[];
  tenants_needing_attention: PlatformTenant[];
}

export interface MaskedSecret {
  set: boolean;
  last4?: string;
}

export interface IntegrationBlock {
  enabled?: boolean;
  [key: string]: boolean | string | MaskedSecret | undefined;
}

export interface PlatformIntegrationsSettings {
  stripe: IntegrationBlock;
  quickbooks: IntegrationBlock;
  avalara: IntegrationBlock;
  smtp: IntegrationBlock;
  storage: IntegrationBlock;
  updated_at: string;
}

export interface PlatformIntegrationsSettingsInput {
  stripe?: Record<string, string>;
  quickbooks?: Record<string, string>;
  avalara?: Record<string, string>;
  smtp?: Record<string, string>;
  storage?: Record<string, string>;
}

export interface PlatformConfig {
  brand_overrides: Record<string, unknown>;
  feature_flags: Record<string, boolean>;
  updated_at: string;
}

export interface PlatformConfigInput {
  brand_overrides?: Record<string, unknown>;
  feature_flags?: Record<string, boolean>;
}

export interface PlatformBillingSettings {
  trial_days: number;
  default_plan_id: string;
  checkout_success_url?: string;
  checkout_cancel_url?: string;
  portal_return_url?: string;
  updated_at?: string;
}

export interface PlatformBillingSettingsInput {
  trial_days?: number;
  default_plan_id?: string;
  checkout_success_url?: string;
  checkout_cancel_url?: string;
  portal_return_url?: string;
}

export interface PlatformModuleCatalogEntry {
  id: string;
  name: string;
  description?: string;
  core: boolean;
  industry_packs?: string[];
}

export interface PlatformModuleSettings {
  catalog: PlatformModuleCatalogEntry[];
  globally_enabled: Record<string, boolean>;
  pack_defaults: Record<string, Record<string, boolean>>;
  industry_packs: { id: string; name: string; description: string; modules: string[] }[];
  updated_at: string;
}

export interface PlatformModuleSettingsPatch {
  globally_enabled?: Record<string, boolean>;
  pack_defaults?: Record<string, Record<string, boolean>>;
}

export interface PlatformAnnouncement {
  id: string;
  message: string;
  severity: "info" | "warning" | "critical" | string;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
}

export interface PlatformAnnouncementInput {
  message: string;
  severity?: string;
  active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface PlatformAuditEntry {
  id: string;
  admin_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PublicPlan {
  id: string;
  name: string;
  description: string;
  price_monthly?: number | null;
  price_monthly_cents?: number | null;
  price_from?: number | null;
  badge?: string | null;
  features?: string[];
}

export class PlatformAdminClient {
  constructor(
    private baseUrl: string,
    private token?: string,
  ) {}

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw parseFetchError(err);
    }

    if (!res.ok) {
      const raw = await res.json().catch(() => null);
      throw parseApiError(res, raw);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return res.json() as Promise<T>;
  }

  login(email: string, password: string) {
    return this.request<PlatformAuthResponse>("POST", "/platform/auth/login", { email, password });
  }

  listPlans() {
    return this.request<{ data: PlatformPlan[] }>("GET", "/platform/plans");
  }

  createPlan(input: PlatformPlanInput) {
    return this.request<PlatformPlan>("POST", "/platform/plans", input);
  }

  updatePlan(id: string, input: Partial<PlatformPlanInput>) {
    return this.request<PlatformPlan>("PATCH", `/platform/plans/${id}`, input);
  }

  deletePlan(id: string) {
    return this.request<void>("DELETE", `/platform/plans/${id}`);
  }

  listPromotions() {
    return this.request<{ data: PlatformPromotion[] }>("GET", "/platform/promotions");
  }

  createPromotion(input: PlatformPromotionInput) {
    return this.request<PlatformPromotion>("POST", "/platform/promotions", input);
  }

  updatePromotion(id: string, input: Partial<PlatformPromotionInput>) {
    return this.request<PlatformPromotion>("PATCH", `/platform/promotions/${id}`, input);
  }

  deletePromotion(id: string) {
    return this.request<void>("DELETE", `/platform/promotions/${id}`);
  }

  listLandingContent(section?: string) {
    const q = section ? `?section=${encodeURIComponent(section)}` : "";
    return this.request<{ data: LandingContentBlock[] }>("GET", `/platform/landing-content${q}`);
  }

  createLandingContent(input: LandingContentInput) {
    return this.request<LandingContentBlock>("POST", "/platform/landing-content", input);
  }

  updateLandingContent(id: string, input: Partial<LandingContentInput>) {
    return this.request<LandingContentBlock>("PATCH", `/platform/landing-content/${id}`, input);
  }

  deleteLandingContent(id: string) {
    return this.request<void>("DELETE", `/platform/landing-content/${id}`);
  }

  listTenants() {
    return this.request<{ data: PlatformTenant[] }>("GET", "/platform/tenants");
  }

  getTenant(id: string) {
    return this.request<PlatformTenant>("GET", `/platform/tenants/${id}`);
  }

  createTenant(input: PlatformTenantCreateInput) {
    return this.request<PlatformTenant>("POST", "/platform/tenants", input);
  }

  updateTenant(id: string, patch: PlatformTenantPatch) {
    return this.request<PlatformTenant>("PATCH", `/platform/tenants/${id}`, patch);
  }

  listUsers(params?: { tenant_id?: string }) {
    const q = params?.tenant_id ? `?tenant_id=${encodeURIComponent(params.tenant_id)}` : "";
    return this.request<{ data: PlatformUser[] }>("GET", `/platform/users${q}`);
  }

  getUser(id: string) {
    return this.request<PlatformUser>("GET", `/platform/users/${id}`);
  }

  createUser(input: PlatformUserCreateInput) {
    return this.request<PlatformUser>("POST", "/platform/users", input);
  }

  updateUser(id: string, input: PlatformUserUpdateInput) {
    return this.request<PlatformUser>("PATCH", `/platform/users/${id}`, input);
  }

  deleteUser(id: string) {
    return this.request<void>("DELETE", `/platform/users/${id}`);
  }

  getStats() {
    return this.request<PlatformStats>("GET", "/platform/stats");
  }

  getMetrics() {
    return this.request<PlatformMetrics>("GET", "/platform/metrics");
  }

  getConfig() {
    return this.request<PlatformConfig>("GET", "/platform/config");
  }

  updateConfig(input: PlatformConfigInput) {
    return this.request<PlatformConfig>("PATCH", "/platform/config", input);
  }

  getBillingSettings() {
    return this.request<PlatformBillingSettings>("GET", "/platform/billing-settings");
  }

  updateBillingSettings(input: PlatformBillingSettingsInput) {
    return this.request<PlatformBillingSettings>("PATCH", "/platform/billing-settings", input);
  }

  getIntegrationsSettings() {
    return this.request<PlatformIntegrationsSettings>("GET", "/platform/integrations/settings");
  }

  updateIntegrationsSettings(input: PlatformIntegrationsSettingsInput) {
    return this.request<PlatformIntegrationsSettings>("PATCH", "/platform/integrations/settings", input);
  }

  getModuleSettings() {
    return this.request<PlatformModuleSettings>("GET", "/platform/modules");
  }

  updateModuleSettings(input: PlatformModuleSettingsPatch) {
    return this.request<PlatformModuleSettings>("PATCH", "/platform/modules", input);
  }

  listAnnouncements() {
    return this.request<{ data: PlatformAnnouncement[] }>("GET", "/platform/announcements");
  }

  createAnnouncement(input: PlatformAnnouncementInput) {
    return this.request<PlatformAnnouncement>("POST", "/platform/announcements", input);
  }

  updateAnnouncement(id: string, input: Partial<PlatformAnnouncementInput>) {
    return this.request<PlatformAnnouncement>("PATCH", `/platform/announcements/${id}`, input);
  }

  deleteAnnouncement(id: string) {
    return this.request<void>("DELETE", `/platform/announcements/${id}`);
  }

  listAuditLog(params?: { limit?: number; offset?: number }) {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    const q = search.toString();
    return this.request<{ data: PlatformAuditEntry[] }>(
      "GET",
      `/platform/audit-log${q ? `?${q}` : ""}`,
    );
  }
}

export function createPlatformAdminClient(baseUrl: string, token?: string) {
  return new PlatformAdminClient(baseUrl, token);
}
