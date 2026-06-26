import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  getMessages,
  LOCALE_COOKIE,
  matchAcceptLanguage,
  routing,
  isLocale,
} from "@fieldforge/i18n";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale = fromCookie && isLocale(fromCookie) ? fromCookie : routing.defaultLocale;

  if (!fromCookie) {
    const accept = (await headers()).get("accept-language");
    const matched = matchAcceptLanguage(accept);
    if (matched) locale = matched;
  }

  return {
    locale,
    messages: getMessages(locale),
  };
});
