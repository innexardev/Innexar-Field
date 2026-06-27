import type { MetadataRoute } from "next";
import { INDUSTRY_VERTICALS } from "./lib/industries";
import { getPostsFromConfig } from "./lib/posts";
import { getMarketingBaseUrl } from "./lib/site-url";
import {
  getAllCityProblemRoutes,
  getAllLocalPageRoutes,
  solutionsHubPath,
  stateHubPath,
} from "./lib/solution-routes";
import { LOCAL_SEO_STATES } from "../lib/local-seo-data";
import { SOLUTION_PROBLEMS } from "../lib/local-seo-content";

const STATIC_PATHS = [
  "",
  "/features",
  "/solutions",
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

  const solutionsHub: MetadataRoute.Sitemap = [
    {
      url: `${base}${solutionsHubPath()}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];

  const stateHubEntries: MetadataRoute.Sitemap = LOCAL_SEO_STATES.map((state) => ({
    url: `${base}${stateHubPath(state.slug)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: state.tier === 1 ? 0.75 : state.tier === 2 ? 0.7 : 0.65,
  }));

  const problemEntries: MetadataRoute.Sitemap = SOLUTION_PROBLEMS.map((problem) => ({
    url: `${base}/solutions/${problem.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const cityEntries: MetadataRoute.Sitemap = getAllLocalPageRoutes().map((page) => ({
    url: `${base}${page.path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.55,
  }));

  const cityProblemEntries: MetadataRoute.Sitemap = getAllCityProblemRoutes().map((page) => ({
    url: `${base}${page.path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    ...staticEntries,
    ...solutionsHub,
    ...stateHubEntries,
    ...problemEntries,
    ...industryEntries,
    ...blogEntries,
    ...cityEntries,
    ...cityProblemEntries,
  ];
}
