"use client";

import { useBrand, useConfig } from "@/components/brand-provider";
import { BrandLogo } from "@fieldforge/ui";
import {
  IconCalendar,
  IconChart,
  IconCheck,
  IconCreditCard,
  IconLayoutDashboard,
  IconShield,
  IconTruck,
} from "@fieldforge/ui";
import type { ComponentType, SVGProps } from "react";

type BrandIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const LOGIN_BULLETS = [
  { icon: IconCalendar, text: "Real-time job tracking" },
  { icon: IconCreditCard, text: "Estimates & invoicing" },
  { icon: IconTruck, text: "Mobile field app" },
] as const;

const SIGNUP_FEATURES = [
  { icon: IconLayoutDashboard, text: "One workspace — CRM, scheduling & billing" },
  { icon: IconCalendar, text: "Dispatch crews and never miss a visit" },
  { icon: IconChart, text: "Job costing with real margin visibility" },
  { icon: IconTruck, text: "Mobile PWA for technicians in the field" },
] as const;

function FeatureList({
  items,
}: {
  items: ReadonlyArray<{ icon: BrandIcon; text: string }>;
}) {
  return (
    <ul className="auth-brand-features">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="auth-brand-features__item">
          <span className="auth-brand-features__icon" aria-hidden>
            <Icon size={16} />
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}

export function AuthBrandPanel({ variant = "login" }: { variant?: "login" | "signup" }) {
  const brand = useBrand();
  const { pricing } = useConfig();

  return (
    <div className="auth-brand-panel">
      <div className="relative z-10">
        <BrandLogo
          src={brand.logo.wordmark}
          alt={brand.name}
          height={36}
          variant="onPrimary"
        />
        {variant === "signup" ? (
          <div className="mt-4 space-y-2">
            <p className="max-w-md text-xl font-semibold leading-snug text-white">
              Stop losing jobs and margin to scattered tools.
            </p>
            <p className="max-w-sm text-base font-light text-white/85">{brand.tagline}</p>
          </div>
        ) : (
          <p className="mt-3 max-w-sm text-lg font-light text-white/90">{brand.tagline}</p>
        )}
      </div>

      <div className="relative z-10 space-y-5 text-sm text-white/75">
        {variant === "signup" ? (
          <>
            <p className="max-w-md leading-relaxed">{brand.description}</p>
            <FeatureList items={SIGNUP_FEATURES} />
            <div className="auth-brand-proof">
              <IconShield size={18} className="shrink-0 text-[var(--brand-accent-muted)]" />
              <span>
                {pricing.trial_days}-day full-access trial on {brand.name} — no credit card
                required
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="max-w-sm leading-relaxed">{brand.description}</p>
            <ul className="space-y-2">
              {LOGIN_BULLETS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <IconCheck size={16} className="shrink-0 text-[var(--brand-accent-muted)]" />
                  {text}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {variant === "signup" && (
        <div className="relative z-10 border-t border-white/15 pt-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">
            Trusted by field service teams
          </p>
          <p className="mt-1 text-sm text-white/70">
            Cleaning · Construction · Field services — one platform, every job.
          </p>
        </div>
      )}
    </div>
  );
}

export function AuthMobileBrand() {
  const brand = useBrand();

  return (
    <div className="auth-mobile-brand lg:hidden">
      <BrandLogo
        src={brand.logo.wordmark}
        alt={brand.name}
        height={28}
      />
    </div>
  );
}
