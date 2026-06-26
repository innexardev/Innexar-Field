import type { HTMLAttributes, ReactNode } from "react";

const variants = {
  default:
    "border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]",
  elevated:
    "border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] shadow-[0_4px_12px_-2px_rgba(15,23,42,0.08),0_2px_4px_-2px_rgba(15,23,42,0.04)]",
  interactive:
    "border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))] hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)] cursor-pointer",
  featured:
    "border border-[var(--brand-accent)] bg-[var(--brand-surface)] ring-1 ring-[color-mix(in_srgb,var(--brand-accent)_25%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--brand-accent)_15%,transparent),0_12px_32px_-12px_color-mix(in_srgb,var(--brand-accent)_35%,transparent)]",
} as const;

export function Card({
  variant = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return (
    <div
      className={`rounded-xl transition-all duration-300 ease-out ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-b border-[var(--brand-border)] px-6 py-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-[var(--brand-text-primary)] ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}
