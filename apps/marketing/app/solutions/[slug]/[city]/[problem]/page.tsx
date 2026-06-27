import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadConfig } from "@fieldforge/config";
import { Section } from "@fieldforge/ui";
import { MarketingShell } from "../../../../components/marketing-shell";
import { PageHero } from "../../../../components/page-hero";
import { SignupLink } from "../../../../components/signup-link";
import {
  CityProblemHubLinks,
  SolutionsBreadcrumbs,
} from "../../../../components/solutions-internal-links";
import { fillCityProblemTemplate } from "../../../../lib/city-problems";
import { APP_URL } from "../../../../lib/constants";
import { pageMetadata } from "../../../../lib/metadata";
import {
  getCityProblemRoute,
  getAllCityProblemRoutes,
  isStateSlug,
} from "../../../../lib/solution-routes";
import { getSolutionBySlug } from "../../../../lib/solutions";

type PageProps = { params: Promise<{ slug: string; city: string; problem: string }> };

export function generateStaticParams() {
  return getAllCityProblemRoutes().map((route) => ({
    slug: route.stateSlug,
    city: route.citySlug,
    problem: route.problemSlug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, city, problem } = await params;
  if (!isStateSlug(slug)) return {};

  const route = getCityProblemRoute(slug, city, problem);
  if (!route) return {};

  const config = loadConfig();
  const title = fillCityProblemTemplate(route.problem.headlineTemplate, {
    city: route.cityName,
    state: route.stateName,
    stateAbbr: route.stateAbbr,
    brand: config.brand.name,
  });

  return pageMetadata(
    title,
    fillCityProblemTemplate(route.problem.introTemplate, {
      city: route.cityName,
      state: route.stateName,
      stateAbbr: route.stateAbbr,
      brand: config.brand.name,
    }),
    { path: `${route.path}/${route.problem.slug}` },
  );
}

export default async function CityProblemSolutionPage({ params }: PageProps) {
  const { slug, city, problem } = await params;
  if (!isStateSlug(slug)) notFound();

  const route = getCityProblemRoute(slug, city, problem);
  if (!route) notFound();

  const config = loadConfig();
  const vars = {
    city: route.cityName,
    state: route.stateName,
    stateAbbr: route.stateAbbr,
    brand: config.brand.name,
  };
  const national = getSolutionBySlug(route.problem.nationalSolutionSlug);
  const headline = fillCityProblemTemplate(route.problem.headlineTemplate, vars);
  const intro = fillCityProblemTemplate(route.problem.introTemplate, vars);

  return (
    <MarketingShell>
      <SolutionsBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Solutions", href: "/solutions" },
          { label: route.stateName, href: `/solutions/${route.stateSlug}` },
          { label: route.cityName, href: route.path },
          { label: route.problem.title },
        ]}
      />
      <PageHero title={headline} subtitle={intro}>
        <SignupLink
          href={`${APP_URL}/signup?utm_content=${route.citySlug}&utm_term=${route.problem.slug}`}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] shadow-lg transition hover:opacity-90"
        >
          Start {config.pricing.trial_days}-day free trial
        </SignupLink>
      </PageHero>

      <Section
        title={`How ${config.brand.name} helps ${route.cityName} teams`}
        subtitle={national ? `Built around our ${national.name.toLowerCase()} playbook` : undefined}
        className="border-t border-[var(--brand-border)] bg-white pt-0"
      >
        <div className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
          <p>
            {route.cityName} operators searching for {route.problem.title.toLowerCase()} usually need one
            connected workflow — not another point tool. {config.brand.name} links scheduling, crews,
            invoicing, and job costing so your team in {route.stateAbbr} runs from a single source of truth.
          </p>
          {national && (
            <p>
              For a deeper dive on {national.name.toLowerCase()}, see our{" "}
              <Link href={`/solutions/${national.slug}`} className="text-[var(--brand-accent)] hover:underline">
                national guide
              </Link>{" "}
              — then return here for {route.cityName}-specific context and related local pages below.
            </p>
          )}
        </div>
      </Section>

      <CityProblemHubLinks local={route} problemSlug={route.problem.slug} />
    </MarketingShell>
  );
}
