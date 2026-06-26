"use client";

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { Shell } from "@fieldforge/ui";
import { SyncBadge } from "@/components/sync-badge";
import { useNavGroupLabel, useShellLabels, useTranslatedNav } from "@/lib/i18n/shell-labels";
import { useAppPage } from "@/lib/use-app-page";

export function ModulePage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { brand, user, nav, pathname, onLogout } = useAppPage();
  const shellLabels = useShellLabels();
  const groupLabel = useNavGroupLabel();
  const translatedNav = useTranslatedNav(nav);
  if (!user) return null;

  return (
    <Shell
      brand={brand.name}
      wordmarkSrc={brand.logo.wordmark}
      nav={translatedNav}
      userEmail={user.email}
      currentPath={pathname}
      onLogout={onLogout}
      labels={shellLabels}
      groupLabel={groupLabel}
      sidebarFooter={<div className="mb-2 px-1"><LanguageSwitcher variant="sidebar" /></div>}
      headerActions={
        <>
          <LanguageSwitcher variant="compact" />
          <SyncBadge surface />
        </>
      }
    >
      <div className="p-6 sm:p-8">
        <header className="page-enter">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-text-primary)]">{title}</h1>
              {subtitle && <p className="mt-1 text-[var(--brand-text-secondary)]">{subtitle}</p>}
            </div>
            {actions}
          </div>
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </Shell>
  );
}
