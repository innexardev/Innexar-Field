"use client";

import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-[var(--brand-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-text-primary)]">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--brand-text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
