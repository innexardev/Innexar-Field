import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cache } from "react";
import yaml from "yaml";
import { API_URL } from "./constants";

const CONFIG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../config",
);

const MARKETING_ENDPOINTS = ["/public/marketing-content", "/platform/marketing-content/public"] as const;

export type BlogPostListing = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readMinutes: number;
  category: string;
  featured: boolean;
};

export type CaseStudyResult = {
  label: string;
  value: string;
};

export type CaseStudy = {
  company: string;
  location: string;
  teamSize: string;
  headline: string;
  challenge: string;
  solution: string;
  results: CaseStudyResult[];
  quote: string;
  author: string;
};

type RawBlogPost = {
  slug: string;
  title: string;
  description: string;
  published_at: string;
  read_minutes: number;
  category: string;
  featured?: boolean;
};

type RawCaseStudy = {
  company: string;
  location: string;
  team_size: string;
  headline: string;
  challenge: string;
  solution: string;
  results: CaseStudyResult[];
  quote: string;
  author: string;
};

type RawMarketingContent = {
  blog?: {
    posts?: RawBlogPost[];
  };
  case_studies?: Record<string, RawCaseStudy[]>;
  pages?: Record<string, RawPageContent>;
};

export type PageHeroContent = {
  title: string;
  subtitle: string;
};

export type PageValue = {
  title: string;
  description: string;
};

export type PageSection = {
  title: string;
  body: string;
};

export type ChangelogEntry = {
  date: string;
  version: string;
  title: string;
  highlights: string[];
};

export type ReferralReward = {
  referrerCredit: string;
  refereeCredit: string;
  activeDaysRequired: number;
};

export type PageCta = {
  title: string;
  subtitle: string;
  fallbackHref?: string;
};

export type AboutPageContent = {
  metaDescription: string;
  hero: PageHeroContent;
  intro: string;
  mission: {
    title: string;
    subtitle: string;
    body: string;
  };
  values: PageValue[];
  cta: PageCta;
};

export type SecurityPageContent = {
  metaDescription: string;
  hero: PageHeroContent;
  sections: PageSection[];
};

export type ChangelogPageContent = {
  metaDescription: string;
  hero: PageHeroContent;
  entries: ChangelogEntry[];
};

export type ReferralPageContent = {
  metaDescription: string;
  hero: PageHeroContent;
  sections: PageSection[];
  reward: ReferralReward;
  cta: PageCta;
};

export type MarketingPageSlug = "about" | "security" | "changelog" | "referral";

type RawPageHero = {
  title: string;
  subtitle: string;
};

type RawPageValue = {
  title: string;
  description: string;
};

type RawPageSection = {
  title: string;
  body: string;
};

type RawChangelogEntry = {
  date: string;
  version: string;
  title: string;
  highlights: string[];
};

type RawReferralReward = {
  referrer_credit: string;
  referee_credit: string;
  active_days_required: number;
};

type RawPageCta = {
  title: string;
  subtitle: string;
  fallback_href?: string;
};

type RawAboutPage = {
  meta_description: string;
  hero: RawPageHero;
  intro: string;
  mission: {
    title: string;
    subtitle: string;
    body: string;
  };
  values: RawPageValue[];
  cta: RawPageCta;
};

type RawSecurityPage = {
  meta_description: string;
  hero: RawPageHero;
  sections: RawPageSection[];
};

type RawChangelogPage = {
  meta_description: string;
  hero: RawPageHero;
  entries: RawChangelogEntry[];
};

type RawReferralPage = {
  meta_description: string;
  hero: RawPageHero;
  sections: RawPageSection[];
  reward: RawReferralReward;
  cta: RawPageCta;
};

type RawPageContent = RawAboutPage | RawSecurityPage | RawChangelogPage | RawReferralPage;

type ApiMarketingPayload = RawMarketingContent;

function normalizePost(raw: RawBlogPost): BlogPostListing {
  return {
    slug: raw.slug,
    title: raw.title,
    description: raw.description.trim(),
    publishedAt: raw.published_at,
    readMinutes: raw.read_minutes,
    category: raw.category,
    featured: raw.featured ?? false,
  };
}

function normalizeCaseStudy(raw: RawCaseStudy): CaseStudy {
  return {
    company: raw.company,
    location: raw.location,
    teamSize: raw.team_size,
    headline: raw.headline.trim(),
    challenge: raw.challenge.trim(),
    solution: raw.solution.trim(),
    results: raw.results,
    quote: raw.quote.trim(),
    author: raw.author,
  };
}

function loadFromConfigFile(): RawMarketingContent {
  const filePath = path.join(CONFIG_ROOT, "marketing-content.yaml");
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return yaml.parse(fs.readFileSync(filePath, "utf8")) as RawMarketingContent;
}

function normalizePageSection(raw: RawPageSection): PageSection {
  return {
    title: raw.title,
    body: raw.body.trim(),
  };
}

function normalizeAboutPage(raw: RawAboutPage): AboutPageContent {
  return {
    metaDescription: raw.meta_description.trim(),
    hero: raw.hero,
    intro: raw.intro.trim(),
    mission: {
      title: raw.mission.title,
      subtitle: raw.mission.subtitle,
      body: raw.mission.body.trim(),
    },
    values: raw.values.map((value) => ({
      title: value.title,
      description: value.description.trim(),
    })),
    cta: {
      title: raw.cta.title,
      subtitle: raw.cta.subtitle,
      fallbackHref: raw.cta.fallback_href,
    },
  };
}

function normalizeSecurityPage(raw: RawSecurityPage): SecurityPageContent {
  return {
    metaDescription: raw.meta_description.trim(),
    hero: raw.hero,
    sections: raw.sections.map(normalizePageSection),
  };
}

function normalizeChangelogEntry(raw: RawChangelogEntry): ChangelogEntry {
  return {
    date: raw.date,
    version: raw.version,
    title: raw.title,
    highlights: raw.highlights,
  };
}

function normalizeChangelogPage(raw: RawChangelogPage): ChangelogPageContent {
  return {
    metaDescription: raw.meta_description.trim(),
    hero: raw.hero,
    entries: raw.entries.map(normalizeChangelogEntry),
  };
}

function normalizeReferralPage(raw: RawReferralPage): ReferralPageContent {
  return {
    metaDescription: raw.meta_description.trim(),
    hero: raw.hero,
    sections: raw.sections.map(normalizePageSection),
    reward: {
      referrerCredit: raw.reward.referrer_credit,
      refereeCredit: raw.reward.referee_credit,
      activeDaysRequired: raw.reward.active_days_required,
    },
    cta: {
      title: raw.cta.title,
      subtitle: raw.cta.subtitle,
      fallbackHref: raw.cta.fallback_href,
    },
  };
}

function loadPagesFromRaw(raw: RawMarketingContent): Partial<Record<MarketingPageSlug, unknown>> {
  const pages = raw.pages ?? {};
  const result: Partial<Record<MarketingPageSlug, unknown>> = {};

  if (pages.about) {
    result.about = normalizeAboutPage(pages.about as RawAboutPage);
  }
  if (pages.security) {
    result.security = normalizeSecurityPage(pages.security as RawSecurityPage);
  }
  if (pages.changelog) {
    result.changelog = normalizeChangelogPage(pages.changelog as RawChangelogPage);
  }
  if (pages.referral) {
    result.referral = normalizeReferralPage(pages.referral as RawReferralPage);
  }

  return result;
}

export function loadMarketingPagesFromConfig(): Partial<Record<MarketingPageSlug, unknown>> {
  return loadPagesFromRaw(loadFromConfigFile());
}

export function loadMarketingContentFromConfig(): {
  posts: BlogPostListing[];
  caseStudies: Record<string, CaseStudy[]>;
} {
  const raw = loadFromConfigFile();
  const posts = (raw.blog?.posts ?? []).map(normalizePost);
  const caseStudies: Record<string, CaseStudy[]> = {};

  for (const [slug, studies] of Object.entries(raw.case_studies ?? {})) {
    caseStudies[slug] = studies.map(normalizeCaseStudy);
  }

  return { posts, caseStudies };
}

function mergeFromApi(payload: ApiMarketingPayload): {
  posts: BlogPostListing[];
  caseStudies: Record<string, CaseStudy[]>;
} {
  const base = loadMarketingContentFromConfig();
  const apiPosts = payload.blog?.posts?.map(normalizePost) ?? [];
  const caseStudies = { ...base.caseStudies };

  for (const [slug, studies] of Object.entries(payload.case_studies ?? {})) {
    caseStudies[slug] = studies.map(normalizeCaseStudy);
  }

  return {
    posts: apiPosts.length ? apiPosts : base.posts,
    caseStudies: Object.keys(caseStudies).length ? caseStudies : base.caseStudies,
  };
}

async function fetchPublicMarketingContent(): Promise<ApiMarketingPayload | null> {
  for (const endpoint of MARKETING_ENDPOINTS) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        return (await res.json()) as ApiMarketingPayload;
      }
    } catch {
      // try next endpoint or fall back to config file
    }
  }
  return null;
}

export const getMarketingContent = cache(async (): Promise<{
  source: "api" | "config";
  posts: BlogPostListing[];
  caseStudies: Record<string, CaseStudy[]>;
}> => {
  const payload = await fetchPublicMarketingContent();
  if (!payload) {
    const config = loadMarketingContentFromConfig();
    return { source: "config", ...config };
  }
  const merged = mergeFromApi(payload);
  return { source: "api", ...merged };
});

export async function getBlogPostListings(): Promise<BlogPostListing[]> {
  const { posts } = await getMarketingContent();
  return [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function getBlogPostListing(slug: string): Promise<BlogPostListing | undefined> {
  const posts = await getBlogPostListings();
  return posts.find((post) => post.slug === slug);
}

export async function getCaseStudiesForIndustry(slug: string): Promise<CaseStudy[]> {
  const { caseStudies } = await getMarketingContent();
  return caseStudies[slug] ?? [];
}

async function resolveMarketingPages(): Promise<Partial<Record<MarketingPageSlug, unknown>>> {
  const payload = await fetchPublicMarketingContent();
  if (payload?.pages) {
    return loadPagesFromRaw(payload);
  }
  return loadMarketingPagesFromConfig();
}

export async function getAboutPageContent(): Promise<AboutPageContent | undefined> {
  const pages = await resolveMarketingPages();
  return pages.about as AboutPageContent | undefined;
}

export async function getSecurityPageContent(): Promise<SecurityPageContent | undefined> {
  const pages = await resolveMarketingPages();
  return pages.security as SecurityPageContent | undefined;
}

export async function getChangelogPageContent(): Promise<ChangelogPageContent | undefined> {
  const pages = await resolveMarketingPages();
  return pages.changelog as ChangelogPageContent | undefined;
}

export async function getReferralPageContent(): Promise<ReferralPageContent | undefined> {
  const pages = await resolveMarketingPages();
  return pages.referral as ReferralPageContent | undefined;
}
