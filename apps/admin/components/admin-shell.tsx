"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@fieldforge/i18n";
import {
  Button,
  BrandLogo,
  IconBuilding,
  IconCreditCard,
  IconFileText,
  IconLayoutDashboard,
  IconReceipt,
  IconShield,
  IconSparkles,
  IconUsers,
  IconWrench,
} from "@fieldforge/ui";
import { BRAND_NAME, DEFAULT_LOGO_WORDMARK } from "@/lib/defaults";
import { useAdminPage } from "@/lib/use-admin-page";

export const ADMIN_NAV = [
  { href: "/admin/dashboard", key: "dashboard", icon: IconLayoutDashboard },
  { href: "/admin/tenants", key: "tenants", icon: IconBuilding },
  { href: "/admin/users", key: "users", icon: IconUsers },
  { href: "/admin/plans", key: "plans", icon: IconCreditCard },
  { href: "/admin/billing", key: "billing", icon: IconReceipt },
  { href: "/admin/integrations", key: "integrations", icon: IconWrench },
  { href: "/admin/modules", key: "modules", icon: IconSparkles },
  { href: "/admin/announcements", key: "announcements", icon: IconFileText },
  { href: "/admin/audit", key: "auditLog", icon: IconShield },
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
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--brand-border)] bg-[var(--brand-surface)] lg:flex">
        <div className="border-b border-[var(--brand-border)] px-4 py-5">
          <BrandLogo src={DEFAULT_LOGO_WORDMARK} alt={BRAND_NAME} height={26} />
          <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-text-muted)]">
            {t("platformAdmin")}
          </p>
          <p className="mt-1.5 truncate text-xs text-[var(--brand-text-secondary)]">{admin.email}</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {ADMIN_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-link ${active ? "sidebar-nav-link-active" : "sidebar-nav-link-inactive"}`}
              >
                <Icon size={18} className="shrink-0 opacity-80" />
                <span className="truncate">{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-[var(--brand-border)] px-2 py-4">
          <div className="px-1 pb-1">
            <LanguageSwitcher variant="compact" />
          </div>
          <button
            type="button"
            onClick={toggle}
            className="sidebar-nav-link sidebar-nav-link-inactive w-full text-left text-xs"
          >
            {dark ? t("lightMode") : t("darkMode")}
          </button>
          <Button variant="ghost" size="sm" className="w-full justify-start px-3" onClick={logout}>
            {t("signOut")}
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3 lg:hidden">
          <BrandLogo src={DEFAULT_LOGO_WORDMARK} alt={BRAND_NAME} height={22} />
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
