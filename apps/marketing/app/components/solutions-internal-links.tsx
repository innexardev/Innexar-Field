import Link from "next/link";
import { Section } from "@fieldforge/ui";
import { CITY_PROBLEM_PAGES } from "../lib/city-problems";
import {
  cityPagePath,
  getSiblingCities,
  nationalProblemPath,
  stateHubPath,
  type LocalPageRoute,
} from "../lib/solution-routes";
import { getSolutionBySlug, SOLUTION_PAGES } from "../lib/solutions";

export function SolutionsBreadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-6 pt-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--brand-text-muted)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href && !isLast ? (
                <Link href={item.href} className="transition hover:text-[var(--brand-accent)]">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-[var(--brand-text-secondary)]" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StateCityGrid({
  stateSlug,
  stateName,
  cities,
}: {
  stateSlug: string;
  stateName: string;
  cities: { name: string; slug: string }[];
}) {
  return (
    <Section
      title={`Cities in ${stateName}`}
      subtitle="Local resources for cleaning and field service operators"
      className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((entry) => (
          <Link
            key={entry.slug}
            href={cityPagePath(stateSlug, entry.slug)}
            className="rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
          >
            {entry.name}
          </Link>
        ))}
      </div>
    </Section>
  );
}

export function CityProblemLinks({
  local,
  title = "Solutions for this market",
}: {
  local: LocalPageRoute;
  title?: string;
}) {
  return (
    <Section title={title} subtitle={`Problem-focused pages for ${local.cityName}`}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CITY_PROBLEM_PAGES.map((problem) => (
          <li key={problem.slug}>
            <Link
              href={`${local.path}/${problem.slug}`}
              className="block rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 transition hover:border-[var(--brand-accent)]"
            >
              <span className="font-medium text-[var(--brand-text-primary)]">{problem.title}</span>
              <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                {problem.title} in {local.cityName}, {local.stateAbbr}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function HubSpokeLinks({
  local,
}: {
  local: LocalPageRoute;
}) {
  const siblings = getSiblingCities(local.stateSlug, local.citySlug, 3);

  return (
    <Section
      title="Explore nearby markets"
      subtitle="More local resources across the hub-spoke network"
      className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
            Up the hub
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/solutions" className="font-medium text-[var(--brand-accent)] hover:underline">
                National solutions hub
              </Link>
            </li>
            <li>
              <Link
                href={stateHubPath(local.stateSlug)}
                className="font-medium text-[var(--brand-accent)] hover:underline"
              >
                {local.stateName} state hub
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
            National problem guides
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {SOLUTION_PAGES.slice(0, 4).map((solution) => (
              <li key={solution.slug}>
                <Link
                  href={nationalProblemPath(solution.slug)}
                  className="font-medium text-[var(--brand-accent)] hover:underline"
                >
                  {solution.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
            Nearby cities
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {siblings.map(({ city, path }) => (
              <li key={city.slug}>
                <Link href={path} className="font-medium text-[var(--brand-accent)] hover:underline">
                  {city.name}, {local.stateAbbr}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

export function CityProblemHubLinks({
  local,
  problemSlug,
}: {
  local: LocalPageRoute;
  problemSlug: string;
}) {
  const problem = CITY_PROBLEM_PAGES.find((entry) => entry.slug === problemSlug);
  const national = problem ? getSolutionBySlug(problem.nationalSolutionSlug) : undefined;
  const siblings = getSiblingCities(local.stateSlug, local.citySlug, 2);
  const relatedProblems = CITY_PROBLEM_PAGES.filter((entry) => entry.slug !== problemSlug).slice(0, 3);

  return (
    <Section
      title="Related pages"
      subtitle="Stay inside the solutions hub — no orphan pages"
      className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
            Hub trail
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/solutions" className="text-[var(--brand-accent)] hover:underline">
                Solutions
              </Link>
            </li>
            <li>
              <Link href={stateHubPath(local.stateSlug)} className="text-[var(--brand-accent)] hover:underline">
                {local.stateName}
              </Link>
            </li>
            <li>
              <Link href={local.path} className="text-[var(--brand-accent)] hover:underline">
                {local.cityName}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
            More in {local.cityName}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {relatedProblems.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`${local.path}/${entry.slug}`}
                  className="text-[var(--brand-accent)] hover:underline"
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
            National guide
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {national && (
              <li>
                <Link
                  href={nationalProblemPath(national.slug)}
                  className="text-[var(--brand-accent)] hover:underline"
                >
                  {national.name}
                </Link>
              </li>
            )}
            {siblings.map(({ city, path }) => (
              <li key={city.slug}>
                <Link href={path} className="text-[var(--brand-accent)] hover:underline">
                  {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
