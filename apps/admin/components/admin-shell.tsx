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

export const ADMIN_NAV = [
  { href: "/admin/dashboard", key: "dashboard" },
  { href: "/admin/tenants", key: "tenants" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/plans", key: "plans" },
  { href: "/admin/billing", key: "billing" },
  { href: "/admin/integrations", key: "integrations" },
  { href: "/admin/modules", key: "modules" },
  { href: "/admin/announcements", key: "announcements" },
  { href: "/admin/audit", key: "auditLog" },
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

/** Protected shell with sidebar — use via `app/admin/layout.tsx`. */
export function AdminLayout({ children }: { children: ReactNode }) {
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
          {ADMIN_NAV.map((item) => {
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
        <div className="space-y-2 border-t border-[var(--brand-border)] px-2 py-4">
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
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            {t("signOut")}
          </Button>
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

/** @deprecated Use AdminLayout via admin route group. Kept for login-free pages. */
export function AdminPage({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
