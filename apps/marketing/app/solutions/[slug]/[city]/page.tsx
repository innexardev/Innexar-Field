import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadConfig } from "@fieldforge/config";
import { Section } from "@fieldforge/ui";
import { MarketingShell } from "../../../components/marketing-shell";
import { PageHero } from "../../../components/page-hero";
import { SignupLink } from "../../../components/signup-link";
import {
  CityProblemLinks,
  HubSpokeLinks,
  SolutionsBreadcrumbs,
} from "../../../components/solutions-internal-links";
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "../../../components/json-ld";
import { APP_URL } from "../../../lib/constants";
import { pageMetadata } from "../../../lib/metadata";
import { getMarketingBaseUrl } from "../../../lib/site-url";
import { getCityBySlug, getStateBySlug } from "../../../../lib/local-seo-data";
import { buildCityPageContent } from "../../../../lib/local-seo-content";
import {
  getAllLocalPageRoutes,
  getLocalPageRoute,
  isStateSlug,
} from "../../../lib/solution-routes";

type PageProps = { params: Promise<{ slug: string; city: string }> };

export function generateStaticParams() {
  return getAllLocalPageRoutes().map((page) => ({
    slug: page.stateSlug,
    city: page.citySlug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, city: citySlug } = await params;
  if (!isStateSlug(slug)) return {};

  const local = getLocalPageRoute(slug, citySlug);
  if (!local) return {};

  const config = loadConfig();
  return pageMetadata(
    `Cleaning business software in ${local.cityName}, ${local.stateAbbr}`,
    `Manage crews, scheduling, and invoicing for ${local.cityName} cleaning and field service companies. ${config.brand.name} — built for US operators.`,
    { path: local.path },
  );
}

export default async function CitySolutionPage({ params }: PageProps) {
  const { slug, city: citySlug } = await params;
  if (!isStateSlug(slug)) notFound();

  const state = getStateBySlug(slug);
  const city = getCityBySlug(slug, citySlug);
  const local = getLocalPageRoute(slug, citySlug);
  if (!state || !city || !local) notFound();

  const config = loadConfig();
  const content = buildCityPageContent(
    state,
    city,
    config.brand.name,
    config.pricing.trial_days,
  );
  const baseUrl = getMarketingBaseUrl();
  const pageUrl = `${baseUrl}${local.path}`;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Solutions", url: `${baseUrl}/solutions` },
    { name: state.name, url: `${baseUrl}/solutions/${state.slug}` },
    { name: city.name, url: pageUrl },
  ]);
  const faqJsonLd = buildFaqJsonLd(content.faqs);

  return (
    <MarketingShell>
      <JsonLd data={[breadcrumbJsonLd, faqJsonLd]} />
      <SolutionsBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Solutions", href: "/solutions" },
          { label: state.name, href: `/solutions/${state.slug}` },
          { label: city.name },
        ]}
      />

      <PageHero title={content.heroTitle} subtitle={content.heroSubtitle}>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <SignupLink
            href={`${APP_URL}/signup?utm_source=marketing&utm_medium=local-seo&utm_content=${city.slug}`}
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
        title={`Built for ${city.name} operators`}
        className="border-t border-[var(--brand-border)] bg-white pt-0"
      >
        <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-[var(--brand-text-secondary)]">
          {content.localIntro}
        </p>
      </Section>

      <Section
        title="Pain points we solve"
        subtitle={`Common challenges for ${city.name} cleaning and field service teams`}
        className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {content.painPoints.map((point) => (
            <article
              key={point.title}
              className="rounded-xl border border-[var(--brand-border)] bg-white p-6"
            >
              <h3 className="text-lg font-semibold text-[var(--brand-text-primary)]">
                {point.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
                <strong className="text-[var(--brand-text-primary)]">The problem: </strong>
                {point.problem}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
                <strong className="text-[var(--brand-accent)]">
                  How {config.brand.name} helps:{" "}
                </strong>
                {point.solution}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
                {point.feature}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Features that match your workflow"
        subtitle="Tied to real operations — not generic bullet lists"
        className="border-t border-[var(--brand-border)] bg-white"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {content.features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6"
            >
              <h3 className="font-semibold text-[var(--brand-text-primary)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <CityProblemLinks local={local} />

      <Section
        title="Frequently asked questions"
        subtitle={`${city.name}, ${state.abbreviation}`}
        className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
      >
        <div className="mx-auto max-w-3xl divide-y divide-[var(--brand-border)] rounded-xl border border-[var(--brand-border)] bg-white">
          {content.faqs.map((faq) => (
            <details key={faq.question} className="group p-6">
              <summary className="cursor-pointer list-none font-medium text-[var(--brand-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </Section>

      <HubSpokeLinks local={local} />

      <section className="bg-[var(--brand-primary)] py-16 text-[var(--brand-primary-foreground)]">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready to streamline operations in {city.name}?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Join {city.name} area teams using {config.brand.name}. {config.pricing.trial_days}-day
            free trial — no credit card required.
          </p>
          <SignupLink
            href={`${APP_URL}/signup?utm_source=marketing&utm_medium=local-seo&utm_content=${city.slug}`}
            className="mt-8 inline-flex rounded-lg bg-white px-8 py-3 text-base font-medium text-[var(--brand-primary)] transition hover:opacity-90"
          >
            Start your free trial
          </SignupLink>
        </div>
      </section>
    </MarketingShell>
  );
}
