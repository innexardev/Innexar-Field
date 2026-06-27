import type { Metadata } from "next";
import Link from "next/link";
import { loadConfig } from "@fieldforge/config";
import { Section } from "@fieldforge/ui";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { SignupLink } from "../components/signup-link";
import { SolutionsBreadcrumbs } from "../components/solutions-internal-links";
import { pageMetadata } from "../lib/metadata";
import { APP_URL } from "../lib/constants";
import { getTier1States } from "../../lib/local-seo-data";
import { SOLUTION_PROBLEM_SUMMARIES } from "../lib/solutions";
import { stateHubPath } from "../lib/solution-routes";

const config = loadConfig();

export const metadata: Metadata = pageMetadata(
  "Solutions for cleaning & field service businesses",
  `${config.brand.name} solves scheduling chaos, crew coordination, late invoicing, and scaling pains for US house cleaning and field service companies.`,
  { path: "/solutions" },
);

export default function SolutionsHubPage() {
  const tier1States = getTier1States();

  return (
    <MarketingShell>
      <SolutionsBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Solutions" }]}
      />
      <PageHero
        title="Problems we solve for field service businesses"
        subtitle={`You did not start a cleaning company to fight spreadsheets, group texts, and late payments. ${config.brand.name} connects scheduling, crews, invoicing, and job costing in one platform.`}
      >
        <SignupLink
          href={`${APP_URL}/signup`}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] shadow-lg transition-all duration-300 hover:opacity-90"
        >
          Start your {config.pricing.trial_days}-day free trial
        </SignupLink>
      </PageHero>

      <Section
        title="Operations problems we hear every day"
        subtitle="Helpful, practical solutions — not generic software fluff"
        className="border-t border-[var(--brand-border)] bg-white pt-0"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SOLUTION_PROBLEM_SUMMARIES.map((problem) => (
            <div
              key={problem.slug}
              className="flex h-full flex-col rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6"
            >
              <h3 className="text-lg font-semibold text-[var(--brand-text-primary)]">{problem.title}</h3>
              <p className="mt-2 flex-1 text-sm text-[var(--brand-text-secondary)]">{problem.description}</p>
              <Link
                href={`/solutions/${problem.slug}`}
                className="mt-4 inline-flex text-sm font-medium text-[var(--brand-accent)] hover:underline"
              >
                Learn more →
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Solutions by state"
        subtitle="Tier 1 markets — local hubs for cleaning and field service businesses"
        className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tier1States.map((state) => (
            <Link
              key={state.slug}
              href={stateHubPath(state.slug)}
              className="rounded-xl border border-[var(--brand-border)] bg-white p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold text-[var(--brand-text-primary)]">{state.name}</h3>
              <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
                {state.cities.length} cities · {state.abbreviation}
              </p>
              <p className="mt-2 text-sm text-[var(--brand-accent)]">View {state.name} →</p>
            </Link>
          ))}
        </div>
      </Section>

      <section className="border-t border-[var(--brand-border)] bg-white py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--brand-text-primary)] md:text-3xl">
            Ready to fix operations — not just add another app?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--brand-text-secondary)]">
            Join field service teams using {config.brand.name} with a {config.pricing.trial_days}-day free
            trial. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <SignupLink
              href={`${APP_URL}/signup`}
              className="inline-flex rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] transition hover:opacity-90"
            >
              Get started free
            </SignupLink>
            <Link
              href="/pricing"
              className="inline-flex rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-8 py-3 text-base font-medium text-[var(--brand-text-primary)] transition hover:bg-[var(--brand-surface)]"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
