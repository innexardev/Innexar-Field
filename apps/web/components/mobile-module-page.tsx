"use client";

import type { ReactNode } from "react";

export function MobileModulePage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mobile-page">
      <div className="mobile-page__header">
        <h1 className="mobile-page__title">{title}</h1>
        {subtitle && <p className="mobile-page__subtitle">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
