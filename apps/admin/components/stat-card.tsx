"use client";

import type { ComponentType, ReactNode } from "react";

export type StatCardTone = "accent" | "success" | "warning" | "info" | "default";

const toneStyles: Record<StatCardTone, { icon: string; ring: string }> = {
  accent: {
    icon: "bg-[var(--brand-info-subtle)] text-[var(--brand-accent)]",
    ring: "border-l-[var(--brand-accent)]",
  },
  success: {
    icon: "bg-[var(--brand-success-subtle)] text-[var(--brand-success)]",
    ring: "border-l-[var(--brand-success)]",
  },
  warning: {
    icon: "bg-[var(--brand-warning-subtle)] text-[var(--brand-warning)]",
    ring: "border-l-[var(--brand-warning)]",
  },
  info: {
    icon: "bg-[var(--brand-info-subtle)] text-[var(--brand-info)]",
    ring: "border-l-[var(--brand-info)]",
  },
  default: {
    icon: "bg-[var(--brand-surface-elevated)] text-[var(--brand-text-secondary)]",
    ring: "border-l-[var(--brand-border)]",
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  tone?: StatCardTone;
  children?: ReactNode;
}) {
  const styles = toneStyles[tone];

  return (
    <div className={`stat-card border-l-4 ${styles.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--brand-text-primary)]">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">{hint}</p>}
          {children}
        </div>
        {Icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
            aria-hidden
          >
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
