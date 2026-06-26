import { loadConfig } from "@fieldforge/config";

export function getMarketingBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_MARKETING_URL) {
    return process.env.NEXT_PUBLIC_MARKETING_URL.replace(/\/$/, "");
  }
  const config = loadConfig();
  return `https://${config.brand.domains.marketing}`;
}
