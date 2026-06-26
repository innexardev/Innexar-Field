import { cache } from "react";
import { loadConfig, type PricingPlan } from "@fieldforge/config";
import { API_URL } from "./constants";

const LANDING_ENDPOINTS = ["/platform/landing-content/public", "/public/landing"] as const;

export interface LandingCta {
  label: string;
  href: string;
}

export interface LandingHero {
  badge: string;
  headline: string;
  subheadline: string;
  ctaPrimary: LandingCta;
  ctaSecondary: LandingCta;
  footnote: string;
}

export interface LandingFeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface LandingFeatures {
  title: string;
  subtitle: string;
  items: LandingFeatureItem[];
}

export interface LandingPlan {
  id: string;
  name: string;
  description: string;
  badge: string | null;
  priceMonthly: number | null;
  priceFrom: number | null;
  features: string[];
  featured: boolean;
  enterprise: boolean;
}

export interface LandingPricing {
  title: string;
  subtitle: string;
  trialDays: number;
  plans: LandingPlan[];
}

export interface LandingPromo {
  message: string;
  href: string;
  dismissible: boolean;
}

export interface LandingContent {
  source: "api" | "config";
  hero: LandingHero;
  features: LandingFeatures;
  pricing: LandingPricing;
  promo: LandingPromo | null;
}

interface ApiLandingPayload {
  hero?: Partial<{
    badge: string;
    headline: string;
    subheadline: string;
    cta_primary: LandingCta;
    cta_secondary: LandingCta;
    footnote: string;
  }>;
  features?: Partial<{
    title: string;
    subtitle: string;
    items: LandingFeatureItem[];
  }>;
  pricing?: Partial<{
    title: string;
    subtitle: string;
    trial_days: number;
    plans: ApiPlan[];
  }>;
  promo?: Partial<LandingPromo & { active?: boolean }> | null;
  promotion?: Partial<LandingPromo & { active?: boolean }> | null;
  blocks?: Array<{ section: string; content: Record<string, unknown> }>;
  plans?: ApiPlan[];
}

interface ApiPlan {
  id: string;
  name: string;
  description?: string;
  badge?: string | null;
  price_monthly?: number | null;
  price_monthly_cents?: number | null;
  price_from?: number | null;
  price_from_cents?: number | null;
  features?: string[];
  featured?: boolean;
}

const DEFAULT_FEATURE_ITEMS: LandingFeatureItem[] = [
  { icon: "users", title: "CRM & Customers", description: "Leads, properties, and a branded client portal that keeps customers in the loop." },
  { icon: "file-text", title: "Estimates & Quotes", description: "Professional quotes with line items, templates, and built-in e-signature." },
  { icon: "calendar", title: "Scheduling & Dispatch", description: "Jobs, crews, and a mobile PWA so field teams stay productive on the go." },
  { icon: "credit-card", title: "Invoicing & Payments", description: "Stripe-powered billing with idempotent payments and automated reminders." },
  { icon: "calculator", title: "Job Costing", description: "Budget vs. actual margins on every job — know your numbers in real time." },
  { icon: "shield", title: "Multitenant & Secure", description: "PostgreSQL RLS, RBAC, and US compliance ready from day one." },
];

function configFallback(): LandingContent {
  const config = loadConfig();
  const plans = Object.values(config.pricing.plans);
  const featuredPlanId = plans.find((p) => p.badge === "Most Popular")?.id;
  const starterPrice = config.pricing.plans.starter.price_monthly ?? 0;

  return {
    source: "config",
    hero: {
      badge: `${config.pricing.trial_days}-day free trial · No credit card`,
      headline: config.brand.tagline,
      subheadline: config.brand.description.trim(),
      ctaPrimary: {
        label: `Get started — from $${starterPrice}/mo`,
        href: "/signup",
      },
      ctaSecondary: { label: "View pricing", href: "/pricing" },
      footnote: "Trusted by field service teams across the United States",
    },
    features: {
      title: "Everything your field business needs",
      subtitle: "One platform from first lead to final invoice",
      items: DEFAULT_FEATURE_ITEMS,
    },
    pricing: {
      title: "Simple, transparent pricing",
      subtitle: `USD/month · ${config.pricing.trial_days}-day trial on all plans`,
      trialDays: config.pricing.trial_days,
      plans: plans.map((plan) => planToLanding(plan, plan.id === featuredPlanId)),
    },
    promo: null,
  };
}

function planToLanding(plan: PricingPlan, featured: boolean): LandingPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    badge: plan.badge,
    priceMonthly: plan.price_monthly,
    priceFrom: plan.price_from ?? null,
    features: plan.features,
    featured,
    enterprise: plan.id === "enterprise",
  };
}

function apiPlanToLanding(plan: ApiPlan, featured: boolean): LandingPlan {
  const monthly =
    plan.price_monthly ??
    (plan.price_monthly_cents != null ? Math.round(plan.price_monthly_cents / 100) : null);
  const from =
    plan.price_from ?? (plan.price_from_cents != null ? Math.round(plan.price_from_cents / 100) : null);

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? "",
    badge: plan.badge ?? null,
    priceMonthly: monthly,
    priceFrom: from,
    features: plan.features ?? [],
    featured: plan.featured ?? featured,
    enterprise: plan.id === "enterprise",
  };
}

function normalizePayload(raw: ApiLandingPayload): ApiLandingPayload {
  if (!raw.blocks?.length) {
    return raw;
  }

  const merged: ApiLandingPayload = { ...raw };
  for (const block of raw.blocks) {
    const content = block.content ?? {};
    if (block.section === "hero") merged.hero = { ...merged.hero, ...content } as ApiLandingPayload["hero"];
    if (block.section === "features") merged.features = { ...merged.features, ...content } as ApiLandingPayload["features"];
    if (block.section === "pricing") merged.pricing = { ...merged.pricing, ...content } as ApiLandingPayload["pricing"];
    if (block.section === "promo") merged.promo = { ...merged.promo, ...content } as ApiLandingPayload["promo"];
  }
  if (raw.plans?.length && !merged.pricing?.plans) {
    merged.pricing = { ...merged.pricing, plans: raw.plans };
  }
  return merged;
}

function mergeFromApi(payload: ApiLandingPayload): LandingContent {
  const base = configFallback();
  const data = normalizePayload(payload);
  const promoRaw = data.promo ?? data.promotion;

  const plans =
    data.pricing?.plans?.map((plan, i) => {
      const featured = plan.featured ?? (plan.badge === "Most Popular" || i === 1);
      return apiPlanToLanding(plan, featured);
    }) ?? base.pricing.plans;

  const featuredPlanId = plans.find((p) => p.featured)?.id;
  const normalizedPlans = plans.map((plan) => ({
    ...plan,
    featured: plan.id === featuredPlanId,
  }));

  let promo: LandingPromo | null = null;
  if (promoRaw && promoRaw.active !== false && promoRaw.message && promoRaw.href) {
    promo = {
      message: promoRaw.message,
      href: promoRaw.href,
      dismissible: promoRaw.dismissible ?? true,
    };
  }

  return {
    source: "api",
    hero: {
      badge: data.hero?.badge ?? base.hero.badge,
      headline: data.hero?.headline ?? base.hero.headline,
      subheadline: data.hero?.subheadline ?? base.hero.subheadline,
      ctaPrimary: data.hero?.cta_primary ?? base.hero.ctaPrimary,
      ctaSecondary: data.hero?.cta_secondary ?? base.hero.ctaSecondary,
      footnote: data.hero?.footnote ?? base.hero.footnote,
    },
    features: {
      title: data.features?.title ?? base.features.title,
      subtitle: data.features?.subtitle ?? base.features.subtitle,
      items: data.features?.items?.length ? data.features.items : base.features.items,
    },
    pricing: {
      title: data.pricing?.title ?? base.pricing.title,
      subtitle: data.pricing?.subtitle ?? base.pricing.subtitle,
      trialDays: data.pricing?.trial_days ?? base.pricing.trialDays,
      plans: normalizedPlans.length ? normalizedPlans : base.pricing.plans,
    },
    promo,
  };
}

async function fetchPublicLanding(): Promise<ApiLandingPayload | null> {
  for (const path of LANDING_ENDPOINTS) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        return (await res.json()) as ApiLandingPayload;
      }
    } catch {
      // try next endpoint or fall back to config
    }
  }
  return null;
}

export const getLandingContent = cache(async (): Promise<LandingContent> => {
  const payload = await fetchPublicLanding();
  if (!payload) {
    return configFallback();
  }
  return mergeFromApi(payload);
});

export function resolveCtaHref(href: string, appUrl: string, marketingUrl?: string): string {
  const trimmed = href.trim();
  if (!trimmed) {
    return "/";
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return "/";
  }

  if (trimmed.startsWith("//")) {
    return "/";
  }

  if (trimmed.startsWith("/")) {
    if (trimmed === "/signup" || trimmed.startsWith("/signup?")) {
      return `${appUrl.replace(/\/$/, "")}${trimmed}`;
    }
    return trimmed;
  }

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const target = new URL(trimmed);
      const allowed = new Set<string>();
      for (const base of [appUrl, marketingUrl]) {
        if (!base) continue;
        const origin = new URL(base).origin;
        allowed.add(origin);
      }
      if (allowed.has(target.origin)) {
        return trimmed;
      }
    } catch {
      // fall through to safe default
    }
    return "/";
  }

  return "/";
}
