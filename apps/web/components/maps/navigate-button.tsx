"use client";

import { useTranslations } from "next-intl";

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
} as const;

type NavigateButtonProps = {
  href: string;
  className?: string;
  size?: keyof typeof sizes;
};

export function NavigateButton({ href, className = "", size = "sm" }: NavigateButtonProps) {
  const tc = useTranslations("modules.common");

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] font-medium text-[var(--brand-text-primary)] shadow-sm transition-all duration-200 ease-out hover:border-[color-mix(in_srgb,var(--brand-accent)_35%,var(--brand-border))] hover:bg-[var(--brand-surface)] hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-background)] ${sizes[size]} ${className}`}
    >
      {tc("navigate")}
    </a>
  );
}
