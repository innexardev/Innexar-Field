import type { MetadataRoute } from "next";
import { getMarketingBaseUrl } from "./lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getMarketingBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
