import Link from "next/link";
import { loadConfig } from "@fieldforge/config";
import { FeatureCard, Section } from "@fieldforge/ui";
import { FaqSection } from "./faq-section";
import { MarketingShell } from "./marketing-shell";
import { PageHero } from "./page-hero";
import { SignupLink } from "./signup-link";
import { SolutionsBreadcrumbs } from "./solutions-internal-links";
import { APP_URL } from "../lib/constants";
import { getTier1StateHubs } from "../lib/solution-routes";
import { getRelatedSolutions, type SolutionPage } from "../lib/solutions";

type SolutionDetailPageProps = {
  solution: SolutionPage;
};

export function SolutionDetailPage({ solution }: SolutionDetailPageProps) {
  const config = loadConfig();
  const related = getRelatedSolutions(solution.relatedSlugs);
  const signupHref = `${APP_URL}/signup${solution.signupQuery ?? ""}`;
  const tier1States = getTier1StateHubs();

  return (
    <MarketingShell>
      <SolutionsBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Solutions", href: "/solutions" },
          { label: solution.name },
        ]}
      />
      <PageHero title={solution.headline} subtitle={solution.subheadline}>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <SignupLink
            href={signupHref}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] shadow-lg transition-all duration-300 hover:opacity-90"
          >
            Start {config.pricing.trial_days}-day free trial
          </SignupLink>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-8 py-3 text-base font-medium text-[var(--brand-text-primary)] transition-all duration-300 hover:bg-[var(--brand-surface)]"
          >
            View pricing
          </Link>
        </div>
      </PageHero>

      <Section
        title={solution.problemTitle}
        subtitle={`Problems ${config.brand.name} was built to eliminate`}
        className="border-t border-[var(--brand-border)] bg-white pt-0"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {solution.problems.map((problem) => (
            <div
              key={problem.title}
              className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5"
            >
              <h3 className="font-semibold text-[var(--brand-text-primary)]">{problem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={solution.outcomeTitle}
        subtitle={`With ${solution.name.toLowerCase()} in one platform`}
        className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {solution.outcomes.map((outcome) => (
            <FeatureCard
              key={outcome.title}
              icon={
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]">
                  <solution.Icon size={18} />
                </div>
              }
              title={outcome.title}
              description={outcome.description}
              className="h-full"
            />
          ))}
        </div>
      </Section>

      <Section
        title={solution.featureTitle}
        subtitle={`${config.brand.name} — ${solution.name}`}
        className="border-t border-[var(--brand-border)] bg-white"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {solution.features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-success)]/10 text-[var(--brand-success)]">
                <solution.Icon size={14} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand-text-primary)]">{feature.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <FaqSection subtitle={`Common questions about ${solution.name.toLowerCase()}`} items={solution.faq} />

      <Section
        title="Explore more"
        subtitle="Related solutions, states, and resources"
        className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
      >
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
              Related solutions
            </h3>
            <ul className="mt-4 space-y-3">
              {related.map((relatedSolution) => (
                <li key={relatedSolution.slug}>
                  <Link
                    href={`/solutions/${relatedSolution.slug}`}
                    className="text-sm font-medium text-[var(--brand-accent)] transition hover:underline"
                  >
                    {relatedSolution.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/solutions" className="text-sm font-medium text-[var(--brand-accent)] hover:underline">
                  All solutions
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
              Solutions by state
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {tier1States.map((state) => (
                <li key={state.slug}>
                  <Link
                    href={`/solutions/${state.slug}`}
                    className="font-medium text-[var(--brand-accent)] hover:underline"
                  >
                    {state.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
              Helpful links
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-[var(--brand-text-secondary)]">
              {solution.internalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-medium text-[var(--brand-accent)] transition hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <section className="bg-[var(--brand-primary)] py-16 text-[var(--brand-primary-foreground)]">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            Fix {solution.name.toLowerCase()} — start today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Join field service teams using {config.brand.name} with a {config.pricing.trial_days}-day free
            trial. No credit card required.
          </p>
          <SignupLink
            href={signupHref}
            className="mt-8 inline-flex rounded-lg bg-white px-8 py-3 text-base font-medium text-[var(--brand-primary)] transition hover:opacity-90"
          >
            Get started free
          </SignupLink>
        </div>
      </section>
    </MarketingShell>
  );
}
