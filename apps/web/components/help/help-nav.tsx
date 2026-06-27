"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const NAV_ITEMS = [
  { href: "/help", exact: true },
  { href: "/help/faq", exact: false },
  { href: "/help/manual", exact: false },
  { href: "/help/support", exact: false },
] as const;

function navKey(href: string) {
  if (href === "/help") return "hub";
  if (href === "/help/faq") return "faq";
  if (href === "/help/manual") return "manual";
  return "support";
}

export function HelpNav() {
  const pathname = usePathname();
  const t = useTranslations("help.nav");

  return (
    <nav
      aria-label={t("label")}
      className="mb-8 flex flex-wrap gap-2 border-b border-[var(--brand-border)] pb-4"
    >
      {NAV_ITEMS.map(({ href, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] shadow-sm"
                : "text-[var(--brand-text-secondary)] hover:bg-[var(--brand-surface-elevated)] hover:text-[var(--brand-text-primary)]"
            }`}
          >
            {t(navKey(href))}
          </Link>
        );
      })}
    </nav>
  );
}
