import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-primary)] shadow-sm outline-none transition-all duration-200 placeholder:text-[var(--brand-text-muted)] hover:border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))] focus:border-[var(--brand-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
