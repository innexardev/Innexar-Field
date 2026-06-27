import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { getChangelogPageContent } from "../lib/marketing-content";
import { pageMetadata } from "../lib/metadata";

function formatChangelogDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getChangelogPageContent();
  if (!content) {
    return pageMetadata("Changelog", "Product updates for Innexar Field.", { path: "/changelog" });
  }
  return pageMetadata("Changelog", content.metaDescription, { path: "/changelog" });
}

export default async function ChangelogPage() {
  const content = await getChangelogPageContent();
  if (!content) {
    notFound();
  }

  const entries = [...content.entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <MarketingShell>
      <PageHero title={content.hero.title} subtitle={content.hero.subtitle} />

      <div className="mx-auto max-w-3xl px-6 pb-20">
        <ol className="space-y-10">
          {entries.map((entry) => (
            <li key={`${entry.version}-${entry.date}`} className="border-b border-[var(--brand-border)] pb-10 last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-xl font-semibold text-[var(--brand-primary)]">{entry.title}</h2>
                <span className="text-sm font-medium text-[var(--brand-accent)]">v{entry.version}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{formatChangelogDate(entry.date)}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[var(--brand-text-secondary)]">
                {entry.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </MarketingShell>
  );
}
