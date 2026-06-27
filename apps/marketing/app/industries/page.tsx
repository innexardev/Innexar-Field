import type { Metadata } from "next";
import Link from "next/link";
import { loadConfig } from "@fieldforge/config";
import { Card, CardContent } from "@fieldforge/ui";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { pageMetadata } from "../lib/metadata";
import { INDUSTRY_VERTICALS } from "../lib/industries";
import { APP_URL } from "../lib/constants";

const config = loadConfig();

export const metadata: Metadata = pageMetadata(
  "Industries",
  `${config.brand.name} serves house cleaning, construction, and field service companies across the United States with purpose-built industry packs.`,
  { path: "/industries" },
);

export default function IndustriesHubPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Built for your industry"
        subtitle="Purpose-built workflows for the trades that keep America running — pick your vertical and get started in minutes."
      />

      <section className="py-20 pt-0">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
          {INDUSTRY_VERTICALS.map((vertical) => (
            <Card key={vertical.slug} className={`industry-card fade-in-view ${vertical.accent} h-full overflow-hidden`}>
              <CardContent className="flex h-full flex-col py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]">
                  <vertical.Icon size={24} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--brand-text-primary)]">{vertical.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
                  {vertical.description}
                </p>
                <Link
                  href={`/industries/${vertical.slug}`}
                  className="mt-6 text-sm font-medium text-[var(--brand-accent)] transition hover:underline"
                >
                  Learn more
                </Link>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--brand-border)] bg-white py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--brand-text-primary)] md:text-3xl">
            Not sure which pack fits?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--brand-text-secondary)]">
            Start your free trial and switch industry packs anytime. Business and Pro plans support multiple verticals.
          </p>
          <Link
            href={`${APP_URL}/signup`}
            className="mt-8 inline-flex rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] transition hover:opacity-90"
          >
            Start free trial
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
