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

export interface PlatformConfig {
  brand_overrides: Record<string, unknown>;
  feature_flags: Record<string, boolean>;
  updated_at: string;
}

export interface PlatformConfigInput {
  brand_overrides?: Record<string, unknown>;
  feature_flags?: Record<string, boolean>;
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

  updateTenant(id: string, patch: PlatformTenantPatch) {
    return this.request<PlatformTenant>("PATCH", `/platform/tenants/${id}`, patch);
  }

  getStats() {
    return this.request<PlatformStats>("GET", "/platform/stats");
  }

  getConfig() {
    return this.request<PlatformConfig>("GET", "/platform/config");
  }

  updateConfig(input: PlatformConfigInput) {
    return this.request<PlatformConfig>("PATCH", "/platform/config", input);
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
