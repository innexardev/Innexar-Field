import type { Metadata } from "next";
import { loadConfig } from "@fieldforge/config";

export function pageMetadata(title: string, description: string): Metadata {
  const config = loadConfig();
  const fullTitle = `${title} | ${config.brand.name}`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      siteName: config.brand.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
