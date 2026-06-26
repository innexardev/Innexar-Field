"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "./routing.js";

type Variant = "header" | "sidebar" | "compact";

const variantClass: Record<Variant, string> = {
  header:
    "rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm text-[var(--brand-text-primary)]",
  sidebar:
    "w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white/80",
  compact:
    "rounded-md border border-[var(--brand-border)] bg-transparent px-2 py-1 text-xs text-[var(--brand-text-secondary)]",
};

export function LanguageSwitcher({ variant = "header", className = "" }: { variant?: Variant; className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("language");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        aria-label={t("label")}
        className={variantClass[variant]}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
