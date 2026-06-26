"use client";

import type { ComponentType, ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon" aria-hidden>
          <Icon size={28} />
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--brand-text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--brand-text-secondary)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
