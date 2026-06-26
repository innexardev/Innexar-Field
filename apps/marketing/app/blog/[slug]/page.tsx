import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadConfig } from "@fieldforge/config";
import { MarketingShell } from "../../components/marketing-shell";
import { pageMetadata } from "../../lib/metadata";
import { getPostBySlug, getPostsFromConfig, type BlogSection } from "../../lib/posts";
import { getMarketingBaseUrl } from "../../lib/site-url";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPostsFromConfig().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  const config = loadConfig();
  const base = getMarketingBaseUrl();
  const fullTitle = `${post.title} | ${config.brand.name}`;

  return {
    ...pageMetadata(post.title, post.description),
    openGraph: {
      title: fullTitle,
      description: post.description,
      siteName: config.brand.name,
      type: "article",
      publishedTime: post.publishedAt,
      url: `${base}/blog/${post.slug}`,
    },
    alternates: {
      canonical: `${base}/blog/${post.slug}`,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderSection(section: BlogSection, index: number) {
  switch (section.type) {
    case "heading":
      return (
        <h2 key={index} className="mt-10 text-xl font-bold text-[var(--brand-text-primary)] first:mt-0">
          {section.text}
        </h2>
      );
    case "paragraph":
      return (
        <p key={index} className="mt-4 text-[var(--brand-text-secondary)] leading-relaxed">
          {section.text}
        </p>
      );
    case "list":
      return (
        <ul key={index} className="mt-4 list-disc space-y-2 pl-6 text-[var(--brand-text-secondary)]">
          {section.items.map((item) => (
            <li key={item} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const config = loadConfig();

  return (
    <MarketingShell>
      <article className="pb-20 pt-12">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            href="/blog"
            className="text-sm font-medium text-[var(--brand-accent)] transition hover:underline"
          >
            &larr; Back to blog
          </Link>

          <header className="mt-8 border-b border-[var(--brand-border)] pb-8">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--brand-text-muted)]">
              <span className="rounded-full bg-[var(--brand-surface-elevated)] px-3 py-0.5 font-medium text-[var(--brand-text-secondary)]">
                {post.category}
              </span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readMinutes} min read</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--brand-text-primary)] md:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-[var(--brand-text-secondary)] leading-relaxed">{post.description}</p>
          </header>

          <div className="prose-custom mt-8">{post.sections.map(renderSection)}</div>

          <footer className="mt-12 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] p-8 text-center">
            <p className="text-lg font-semibold text-[var(--brand-text-primary)]">
              Ready to run {post.category.toLowerCase()} jobs on {config.brand.name}?
            </p>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
              Start a {config.pricing.trial_days}-day free trial — no credit card required.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex rounded-lg bg-[var(--brand-accent)] px-6 py-2.5 text-sm font-medium text-[var(--brand-accent-foreground)] transition hover:opacity-90"
            >
              Talk to our team
            </Link>
          </footer>
        </div>
      </article>
    </MarketingShell>
  );
}
