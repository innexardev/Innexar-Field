import type { Metadata } from "next";
import { loadConfig } from "@fieldforge/config";
import { getMarketingBaseUrl } from "./site-url";

export type PageMetadataOptions = {
  /** Canonical path (e.g. `/pricing`). Resolved against metadataBase. */
  path?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
};

function getBrandSeo() {
  const config = loadConfig();
  const baseUrl = getMarketingBaseUrl();
  const ogImage = `${baseUrl}${config.brand.logo.wordmark}`;

  return { config, baseUrl, ogImage };
}

/** Root layout metadata — sets metadataBase, title template, and default social cards. */
export function rootMetadata(): Metadata {
  const { config, baseUrl, ogImage } = getBrandSeo();
  const title = `${config.brand.name} — ${config.brand.tagline}`;
  const description = config.brand.description.trim();

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: `%s | ${config.brand.name}`,
    },
    description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: baseUrl,
      siteName: config.brand.name,
      title,
      description,
      images: [{ url: ogImage, alt: config.brand.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

/** Per-page metadata with canonical URL, Open Graph, and Twitter cards. */
export function pageMetadata(
  title: string,
  description: string,
  options: PageMetadataOptions = {},
): Metadata {
  const { config, baseUrl, ogImage } = getBrandSeo();
  const fullTitle = `${title} | ${config.brand.name}`;
  const canonicalPath = options.path;

  return {
    title,
    description,
    ...(options.noIndex && {
      robots: { index: false, follow: false },
    }),
    ...(canonicalPath && {
      alternates: { canonical: canonicalPath },
    }),
    openGraph: {
      title: fullTitle,
      description,
      siteName: config.brand.name,
      type: options.ogType ?? "website",
      ...(canonicalPath && { url: `${baseUrl}${canonicalPath}` }),
      ...(options.publishedTime && { publishedTime: options.publishedTime }),
      images: [{ url: ogImage, alt: config.brand.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}
