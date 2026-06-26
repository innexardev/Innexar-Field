import type { Metadata } from "next";
import Link from "next/link";
import { loadConfig } from "@fieldforge/config";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { pageMetadata } from "../lib/metadata";
import { getBlogPostListings } from "../lib/marketing-content";

const config = loadConfig();

export const metadata: Metadata = pageMetadata(
  "Blog",
  `Field operations insights for contractors — job costing, dispatch, recurring revenue, and growth strategies from the ${config.brand.name} team.`,
);

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogIndexPage() {
  const posts = await getBlogPostListings();

  return (
    <MarketingShell>
      <PageHero
        title="Insights for field contractors"
        subtitle="Practical guides on job costing, dispatch, and building predictable revenue — written for cleaning, construction, and field service teams."
      />

      <section className="pb-20">
        <div className="mx-auto max-w-3xl space-y-8 px-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-xl border border-[var(--brand-border)] bg-white p-8 shadow-sm transition hover:border-[var(--brand-accent)]/30"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--brand-text-muted)]">
                {post.featured && (
                  <span className="rounded-full bg-[var(--brand-accent)]/10 px-3 py-0.5 font-medium text-[var(--brand-accent)]">
                    Featured
                  </span>
                )}
                <span className="rounded-full bg-[var(--brand-surface-elevated)] px-3 py-0.5 font-medium text-[var(--brand-text-secondary)]">
                  {post.category}
                </span>
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readMinutes} min read</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--brand-text-primary)]">
                <Link href={`/blog/${post.slug}`} className="transition hover:text-[var(--brand-accent)]">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-[var(--brand-text-secondary)] leading-relaxed">{post.description}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-5 inline-flex text-sm font-medium text-[var(--brand-accent)] transition hover:underline"
              >
                Read article
              </Link>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
