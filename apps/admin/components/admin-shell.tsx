"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { Button, BrandLogo } from "@fieldforge/ui";
import { BRAND_NAME, DEFAULT_LOGO_WORDMARK } from "@/lib/defaults";
import { useAdminAuth } from "@/lib/auth-context";
import { useAdminPage } from "@/lib/use-admin-page";

const NAV_KEYS = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/plans", key: "plans" },
  { href: "/promotions", key: "promotions" },
  { href: "/landing", key: "landingContent" },
  { href: "/tenants", key: "tenants" },
  { href: "/config", key: "globalConfig" },
  { href: "/audit", key: "auditLog" },
] as const;

function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ff_admin_dark");
    const prefers =
      stored === "true" ||
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(prefers);
    document.documentElement.classList.toggle("dark", prefers);
  }, []);

  function toggle() {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("ff_admin_dark", String(next));
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }

  return { dark, toggle };
}

export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { admin, logout } = useAdminAuth();
  const t = useTranslations("admin");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-accent)]">
              {t("platformAdmin")}
            </p>
            <h1 className="text-lg font-semibold text-[var(--brand-text-primary)]">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="compact" />
            {admin && (
              <span className="hidden text-sm text-[var(--brand-text-secondary)] sm:inline">
                {admin.email}
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={logout}>
              {t("signOut")}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export function AdminPage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { admin, loading, logout } = useAdminPage();
  const { dark, toggle } = useDarkMode();
  const t = useTranslations("admin");

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--brand-text-secondary)]">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-[var(--brand-border)] bg-[var(--brand-surface)] lg:block">
        <div className="px-4 py-6">
          <BrandLogo src={DEFAULT_LOGO_WORDMARK} alt={BRAND_NAME} height={28} variant="onPrimary" />
          <p className="mt-2 text-xs text-[var(--brand-text-muted)]">{t("platformAdmin")}</p>
          <p className="mt-2 truncate text-sm text-[var(--brand-text-secondary)]">{admin.email}</p>
        </div>
        <nav className="space-y-1 px-2 pb-4">
          {NAV_KEYS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[var(--brand-surface-elevated)] font-medium text-[var(--brand-text-primary)]"
                    : "text-[var(--brand-text-secondary)] hover:bg-[var(--brand-surface-elevated)] hover:text-[var(--brand-text-primary)]"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--brand-border)] px-2 py-4 space-y-2">
          <div className="px-1">
            <LanguageSwitcher variant="compact" />
          </div>
          <button
            type="button"
            onClick={toggle}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--brand-text-secondary)] hover:bg-[var(--brand-surface-elevated)]"
          >
            {dark ? t("lightMode") : t("darkMode")}
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3 lg:hidden">
          <p className="text-sm font-medium text-[var(--brand-text-primary)]">{t("platformAdmin")}</p>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <Button variant="ghost" size="sm" onClick={logout}>
              {t("signOut")}
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
