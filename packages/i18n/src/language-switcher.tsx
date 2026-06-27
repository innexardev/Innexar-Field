"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "./routing.js";

type Variant = "header" | "sidebar" | "compact";

/** Native `<option>` inherits sidebar text color — force readable popup in each context. */
const lightPopupOptions =
  "[color-scheme:light] [&>option]:bg-white [&>option]:text-slate-900";
const darkPopupOptions =
  "[color-scheme:dark] [&>option]:bg-slate-900 [&>option]:text-white";

const variantClass: Record<Variant, string> = {
  header:
    `rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm text-[var(--brand-text-primary)] ${lightPopupOptions}`,
  sidebar:
    `w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white/80 ${darkPopupOptions}`,
  compact:
    `rounded-md border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1 text-xs text-[var(--brand-text-secondary)] ${lightPopupOptions}`,
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
