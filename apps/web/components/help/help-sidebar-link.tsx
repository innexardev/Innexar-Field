"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function HelpSidebarLink() {
  const t = useTranslations("help");

  return (
    <Link
      href="/help"
      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 opacity-80"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
      <span>{t("sidebarLink")}</span>
    </Link>
  );
}
