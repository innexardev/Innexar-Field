"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { BrandLogo, Button } from "@fieldforge/ui";
import { usePortalPage } from "@/lib/use-portal-page";

const PORTAL_NAV = [
  { slug: "bookings", path: "/portal/bookings" },
  { slug: "invoices", path: "/portal/invoices" },
  { slug: "payments", path: "/portal/payments" },
  { slug: "documents", path: "/portal/documents" },
  { slug: "messages", path: "/portal/messages" },
  { slug: "support", path: "/portal/support" },
  { slug: "profile", path: "/portal/profile" },
] as const;

export function PortalPage({
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
  const { brand, customer, pathname, onLogout } = usePortalPage();
  const t = useTranslations("modules.portal.shell");

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <div className="min-h-screen bg-[var(--brand-surface)]">
      <header className="border-b border-[var(--brand-border)] bg-[var(--brand-surface-elevated)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo
              src={brand.logo.icon}
              alt={brand.name}
              className="h-8 w-8"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--brand-text-primary)]">{brand.name}</p>
              {customer ? (
                <p className="text-xs text-[var(--brand-text-muted)]">{customer.name}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <Button variant="secondary" size="sm" onClick={onLogout}>
              {t("signOut")}
            </Button>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6"
          aria-label={t("navLabel")}
        >
          {PORTAL_NAV.map((item) => (
            <Link
              key={item.slug}
              href={item.path}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                isActive(item.path)
                  ? "bg-[var(--brand-accent-subtle)] font-medium text-[var(--brand-accent)]"
                  : "text-[var(--brand-text-secondary)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text-primary)]"
              }`}
            >
              {t(`nav.${item.slug}`)}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="page-enter">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-text-primary)]">{title}</h1>
              {subtitle ? <p className="mt-1 text-[var(--brand-text-secondary)]">{subtitle}</p> : null}
            </div>
            {actions}
          </div>
        </header>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
