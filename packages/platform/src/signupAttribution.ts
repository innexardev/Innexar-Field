export const SIGNUP_ATTRIBUTION_STORAGE_KEY = "ff_signup_attribution";

export const SIGNUP_ATTRIBUTION_PARAMS = [
  "ref",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type SignupAttributionParam = (typeof SIGNUP_ATTRIBUTION_PARAMS)[number];

export type SignupAttribution = Partial<Record<SignupAttributionParam, string>>;

export function parseSignupAttribution(
  params: URLSearchParams | Readonly<Record<string, string | undefined>>,
): SignupAttribution {
  const out: SignupAttribution = {};
  for (const key of SIGNUP_ATTRIBUTION_PARAMS) {
    const raw = params instanceof URLSearchParams ? params.get(key) : params[key];
    const value = raw?.trim();
    if (value) {
      out[key] = value.slice(0, 256);
    }
  }
  return out;
}

export function mergeSignupAttribution(
  base: SignupAttribution,
  incoming: SignupAttribution,
): SignupAttribution {
  const merged = { ...base };
  for (const key of SIGNUP_ATTRIBUTION_PARAMS) {
    const value = incoming[key]?.trim();
    if (value) {
      merged[key] = value.slice(0, 256);
    }
  }
  return merged;
}

export function hasSignupAttribution(attribution: SignupAttribution): boolean {
  return SIGNUP_ATTRIBUTION_PARAMS.some((key) => Boolean(attribution[key]?.trim()));
}

export function loadSignupAttribution(): SignupAttribution {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = sessionStorage.getItem(SIGNUP_ATTRIBUTION_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as SignupAttribution;
    return parseSignupAttribution(parsed);
  } catch {
    return {};
  }
}

export function persistSignupAttribution(attribution: SignupAttribution): SignupAttribution {
  if (typeof window === "undefined") {
    return attribution;
  }
  const normalized = parseSignupAttribution(attribution);
  if (!hasSignupAttribution(normalized)) {
    return {};
  }
  sessionStorage.setItem(SIGNUP_ATTRIBUTION_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function captureSignupAttributionFromLocation(
  search = typeof window !== "undefined" ? window.location.search : "",
): SignupAttribution {
  const incoming = parseSignupAttribution(new URLSearchParams(search));
  if (!hasSignupAttribution(incoming)) {
    return loadSignupAttribution();
  }
  return persistSignupAttribution(mergeSignupAttribution(loadSignupAttribution(), incoming));
}

export function appendSignupAttributionToUrl(
  href: string,
  attribution: SignupAttribution = loadSignupAttribution(),
): string {
  if (!hasSignupAttribution(attribution)) {
    return href;
  }
  const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  for (const key of SIGNUP_ATTRIBUTION_PARAMS) {
    const value = attribution[key];
    if (value && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
