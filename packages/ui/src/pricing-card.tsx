import type { ReactNode } from "react";
import { Badge } from "./badge";
import { IconCheck } from "./icons";

export function PricingCard({
  name,
  badge,
  price,
  priceSuffix = "/mo",
  description,
  features,
  cta,
  featured = false,
  className = "",
}: {
  name: string;
  badge?: string;
  price: ReactNode;
  priceSuffix?: string;
  description?: string;
  features: string[];
  cta: ReactNode;
  featured?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border bg-[var(--brand-surface)] p-6 transition-all duration-300 ease-out ${
        featured
          ? "border-[var(--brand-accent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--brand-accent)_20%,transparent),0_16px_48px_-16px_color-mix(in_srgb,var(--brand-accent)_40%,transparent)] lg:scale-[1.02]"
          : "border-[var(--brand-border)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.1)]"
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--brand-text-primary)]">{name}</h3>
        {badge && <Badge>{badge}</Badge>}
      </div>
      <div className="mt-4 text-3xl font-bold text-[var(--brand-text-primary)]">
        {price}
        {priceSuffix && (
          <span className="text-sm font-normal text-[var(--brand-text-muted)]">{priceSuffix}</span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{description}</p>
      )}
      <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--brand-text-primary)]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <IconCheck size={16} className="mt-0.5 shrink-0 text-[var(--brand-accent)]" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}
