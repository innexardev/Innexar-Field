/**
 * Shared i18n for FieldForge Next.js apps.
 *
 * Add module strings:
 * 1. Add keys under a namespace in messages/{en,es,pt-BR}.json (e.g. "estimates": { "title": "..." }).
 * 2. In a client page: `const t = useTranslations("estimates");` then `t("title")`.
 * 3. In a server component: `const t = await getTranslations("estimates");`.
 * 4. Re-run `npm run typecheck` — no code generation required.
 */
import en from "../messages/en.json";
import es from "../messages/es.json";
import ptBR from "../messages/pt-BR.json";
import { type Locale, isLocale } from "./routing.js";

export { locales, defaultLocale, LOCALE_COOKIE, routing, isLocale, matchAcceptLanguage } from "./routing.js";
export type { Locale } from "./routing.js";
export { LanguageSwitcher } from "./language-switcher.js";
export { translateNavGroupLabel, NAV_GROUP_KEYS } from "./nav-groups.js";
export {
  NAV_ITEM_PATH_KEYS,
  translateNavItemLabel,
  translateNavItems,
} from "./nav-items.js";

const catalogs: Record<Locale, typeof en> = {
  en,
  es,
  "pt-BR": ptBR,
};

export function getMessages(locale: string): typeof en {
  return isLocale(locale) ? catalogs[locale] : catalogs.en;
}

export type Messages = typeof en;
