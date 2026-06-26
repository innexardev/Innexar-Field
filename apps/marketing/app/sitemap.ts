import type { MetadataRoute } from "next";
import { INDUSTRY_VERTICALS } from "./lib/industries";
import { getPostsFromConfig } from "./lib/posts";
import { getMarketingBaseUrl } from "./lib/site-url";

const STATIC_PATHS = [
  "",
  "/features",
  "/industries",
  "/pricing",
  "/about",
  "/security",
  "/changelog",
  "/referral",
  "/contact",
  "/blog",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getMarketingBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));

  const industryEntries: MetadataRoute.Sitemap = INDUSTRY_VERTICALS.map((vertical) => ({
    url: `${base}/industries/${vertical.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const blogEntries: MetadataRoute.Sitemap = getPostsFromConfig().map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(`${post.publishedAt}T12:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...industryEntries, ...blogEntries];
}
