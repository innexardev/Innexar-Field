import type { ReactNode } from "react";

export function FeatureCard({
  icon,
  title,
  description,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`group rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand-accent)_35%,var(--brand-border))] hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)] ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)] text-[var(--brand-accent)] transition group-hover:bg-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--brand-text-primary)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{description}</p>
    </div>
  );
}
