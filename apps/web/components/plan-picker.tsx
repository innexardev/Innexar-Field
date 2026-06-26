"use client";

import { useEffect, useMemo, useState } from "react";
import type { PricingPlan } from "@fieldforge/config";
import type { PublicPlan } from "@fieldforge/sdk";
import { Badge, IconCheck } from "@fieldforge/ui";

function formatPrice(plan: PricingPlan): string {
  if (plan.price_monthly != null) return `$${plan.price_monthly}`;
  if (plan.price_from != null) return `From $${plan.price_from}`;
  return "Custom";
}

const SIGNUP_PLAN_ORDER = ["starter", "business", "pro"] as const;

function publicPlanToPricingPlan(plan: PublicPlan): PricingPlan {
  const priceMonthly =
    plan.price_monthly ??
    (plan.price_monthly_cents != null ? Math.round(plan.price_monthly_cents / 100) : null);
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price_monthly: priceMonthly,
    price_yearly: null,
    price_from: plan.price_from ?? undefined,
    stripe_price_id: "",
    badge: plan.badge ?? null,
    limits: {},
    modules: {},
    features: plan.features ?? [],
  };
}

function orderPlans(plans: Record<string, PricingPlan>): PricingPlan[] {
  const ordered = SIGNUP_PLAN_ORDER.filter((id) => plans[id]).map((id) => plans[id]!);
  const extras = Object.values(plans).filter((p) => !SIGNUP_PLAN_ORDER.includes(p.id as (typeof SIGNUP_PLAN_ORDER)[number]));
  return [...ordered, ...extras];
}

export function PlanPicker({
  fallbackPlans,
  apiBase,
  value,
  onChange,
}: {
  fallbackPlans: Record<string, PricingPlan>;
  apiBase: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [plans, setPlans] = useState<Record<string, PricingPlan>>(fallbackPlans);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/public/plans`);
        if (!res.ok) throw new Error("fetch failed");
        const body = (await res.json()) as { data: PublicPlan[] };
        if (!cancelled && body.data?.length) {
          const mapped = Object.fromEntries(
            body.data.map((plan) => [plan.id, publicPlanToPricingPlan(plan)]),
          );
          setPlans(mapped);
        }
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const visible = useMemo(() => orderPlans(plans), [plans]);

  return (
    <fieldset className="form-section__fieldset">
      <legend className="form-section__legend">Plan</legend>
      <div
        className="grid gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Subscription plan"
        aria-busy={loading}
      >
        {visible.map((plan, index) => {
          const selected = value === plan.id;
          const featured = plan.badge === "Most Popular";
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(plan.id)}
              className={`plan-card stagger-item ${selected ? "plan-card--selected" : ""} ${featured ? "plan-card--featured" : ""}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="plan-card__header">
                <span className="plan-card__name">{plan.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {!selected && plan.badge && (
                    <span className="plan-card__badge">
                      <Badge tone={featured ? "default" : "success"}>{plan.badge}</Badge>
                    </span>
                  )}
                  {selected && (
                    <span className="plan-card__check" aria-hidden>
                      <IconCheck size={12} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
              </div>
              <div className="plan-card__price">
                <span className="plan-card__amount">{formatPrice(plan)}</span>
                {plan.price_monthly != null && (
                  <span className="plan-card__period">/mo</span>
                )}
              </div>
              <p className="plan-card__desc">{plan.description}</p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
