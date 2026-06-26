import { defineRouting } from "next-intl/routing";

export const locales = ["en", "es", "pt-BR"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "ff_locale";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "never",
  localeCookie: {
    name: LOCALE_COOKIE,
    maxAge: 60 * 60 * 24 * 365,
  },
});

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Map Accept-Language tags (en-US, pt, etc.) to app locales. */
export function matchAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;
  const parts = header.split(",").map((p) => p.trim().split(";")[0]?.toLowerCase());
  for (const tag of parts) {
    if (!tag) continue;
    if (tag === "pt" || tag.startsWith("pt-")) return "pt-BR";
    if (tag.startsWith("es")) return "es";
    if (tag.startsWith("en")) return "en";
  }
  return undefined;
}
