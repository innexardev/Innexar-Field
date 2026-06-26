import type { ButtonHTMLAttributes } from "react";

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

const variants = {
  primary:
    "bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] shadow-sm shadow-[color-mix(in_srgb,var(--brand-accent)_30%,transparent)] hover:brightness-105 hover:shadow-md active:scale-[0.98]",
  secondary:
    "bg-[var(--brand-surface-elevated)] text-[var(--brand-text-primary)] border border-[var(--brand-border)] shadow-sm hover:border-[color-mix(in_srgb,var(--brand-accent)_35%,var(--brand-border))] hover:bg-[var(--brand-surface)] hover:shadow active:scale-[0.98]",
  ghost:
    "text-[var(--brand-text-secondary)] hover:bg-[var(--brand-surface-elevated)] hover:text-[var(--brand-text-primary)] active:scale-[0.98]",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-background)] disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
