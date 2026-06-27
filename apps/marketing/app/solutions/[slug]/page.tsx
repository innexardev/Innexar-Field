import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadConfig } from "@fieldforge/config";
import { Section } from "@fieldforge/ui";
import { MarketingShell } from "../../components/marketing-shell";
import { PageHero } from "../../components/page-hero";
import { SolutionDetailPage } from "../../components/solution-detail";
import {
  SolutionsBreadcrumbs,
  StateCityGrid,
} from "../../components/solutions-internal-links";
import { SignupLink } from "../../components/signup-link";
import { pageMetadata } from "../../lib/metadata";
import { APP_URL } from "../../lib/constants";
import { getStateBySlug, LOCAL_SEO_STATES } from "../../../lib/local-seo-data";
import { isStateSlug } from "../../lib/solution-routes";
import { getSolutionBySlug, SOLUTION_PAGES } from "../../lib/solutions";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const solutions = SOLUTION_PAGES.map((page) => ({ slug: page.slug }));
  const states = LOCAL_SEO_STATES.map((state) => ({ slug: state.slug }));
  return [...solutions, ...states];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolutionBySlug(slug);
  if (solution) {
    const config = loadConfig();
    return pageMetadata(solution.name, `${solution.headline} — ${config.brand.name}`, {
      path: `/solutions/${slug}`,
    });
  }

  const state = getStateBySlug(slug);
  if (state) {
    const config = loadConfig();
    return pageMetadata(
      `${state.name} field service software`,
      `${config.brand.name} for cleaning and field service companies in ${state.name}. Resources for ${state.cities.length} cities across ${state.abbreviation}.`,
      { path: `/solutions/${slug}` },
    );
  }

  return {};
}

export default async function SolutionSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const solution = getSolutionBySlug(slug);
  if (solution) {
    return <SolutionDetailPage solution={solution} />;
  }

  if (!isStateSlug(slug)) {
    notFound();
  }

  const state = getStateBySlug(slug);
  if (!state) notFound();

  const config = loadConfig();

  return (
    <MarketingShell>
      <SolutionsBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Solutions", href: "/solutions" },
          { label: state.name },
        ]}
      />
      <PageHero
        title={`Field service software for ${state.name}`}
        subtitle={`${config.brand.name} helps ${state.name} cleaning and field service teams dispatch crews, protect margins, and invoice faster.`}
      >
        <SignupLink
          href={`${APP_URL}/signup`}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] shadow-lg transition hover:opacity-90"
        >
          Start {config.pricing.trial_days}-day free trial
        </SignupLink>
      </PageHero>

      <Section
        title={`${state.name} market context`}
        subtitle="Local operations realities for cleaning and field service teams"
        className="border-t border-[var(--brand-border)] bg-white pt-0"
      >
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-[var(--brand-text-secondary)]">
          {state.intro}
        </p>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-[var(--brand-text-muted)]">
          {state.marketContext}
        </p>
      </Section>

      <Section title="National problem guides" subtitle="Start with the pain, then go local">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTION_PAGES.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={`/solutions/${entry.slug}`}
                className="block rounded-lg border border-[var(--brand-border)] px-4 py-3 text-sm font-medium text-[var(--brand-accent)] hover:bg-[var(--brand-surface)]"
              >
                {entry.name}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <StateCityGrid stateSlug={state.slug} stateName={state.name} cities={state.cities} />
    </MarketingShell>
  );
}
