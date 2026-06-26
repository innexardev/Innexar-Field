import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadConfig } from "@fieldforge/config";
import { Badge, FeatureCard, Section } from "@fieldforge/ui";
import { MarketingShell } from "../../components/marketing-shell";
import { PageHero } from "../../components/page-hero";
import { pageMetadata } from "../../lib/metadata";
import { APP_URL } from "../../lib/constants";
import { CaseStudyCard } from "../../components/case-study-card";
import { getCaseStudiesForIndustry } from "../../lib/marketing-content";
import { getIndustryBySlug, INDUSTRY_VERTICALS } from "../../lib/industries";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return INDUSTRY_VERTICALS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vertical = getIndustryBySlug(slug);
  if (!vertical) return {};

  const config = loadConfig();
  return pageMetadata(
    vertical.name,
    `${config.brand.name} for ${vertical.name.toLowerCase()} — ${vertical.description}`,
  );
}

export default async function IndustryVerticalPage({ params }: PageProps) {
  const { slug } = await params;
  const vertical = getIndustryBySlug(slug);
  if (!vertical) notFound();

  const config = loadConfig();
  const caseStudies = await getCaseStudiesForIndustry(slug);

  return (
    <MarketingShell>
      <PageHero title={vertical.headline} subtitle={vertical.description}>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={`${APP_URL}/signup?pack=${vertical.packId}`}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] shadow-lg transition-all duration-300 hover:opacity-90"
          >
            Start free trial
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-8 py-3 text-base font-medium text-[var(--brand-text-primary)] transition-all duration-300 hover:bg-[var(--brand-surface)]"
          >
            View pricing
          </Link>
        </div>
      </PageHero>

      <Section
        title="Why teams choose us"
        subtitle={`Built specifically for ${vertical.name.toLowerCase()} companies in the US`}
        className="border-t border-[var(--brand-border)] bg-white pt-0"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {vertical.highlights.map((highlight) => (
            <div
              key={highlight}
              className="flex items-start gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]">
                <vertical.Icon size={14} />
              </div>
              <p className="text-sm leading-relaxed text-[var(--brand-text-primary)]">{highlight}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How it works" subtitle="Three steps from signup to running your business">
        <div className="grid gap-6 md:grid-cols-3">
          {vertical.workflows.map((workflow, index) => (
            <FeatureCard
              key={workflow.title}
              icon={
                <span className="text-sm font-bold text-[var(--brand-accent)]">{index + 1}</span>
              }
              title={workflow.title}
              description={workflow.description}
              className="h-full"
            />
          ))}
        </div>
      </Section>

      <Section
        title="Included modules"
        subtitle="Everything you need out of the box"
        className="border-t border-[var(--brand-border)] bg-white"
      >
        <div className="flex flex-wrap justify-center gap-3">
          {vertical.modules.map((mod) => (
            <Badge key={mod}>
              {mod}
            </Badge>
          ))}
        </div>
      </Section>

      {caseStudies.length > 0 && (
        <Section
          title="Customer stories"
          subtitle={`How ${vertical.name.toLowerCase()} teams use ${config.brand.name}`}
          className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]"
        >
          <div className="mx-auto max-w-4xl space-y-8">
            {caseStudies.map((study) => (
              <CaseStudyCard key={study.company} study={study} />
            ))}
          </div>
        </Section>
      )}

      <section className="bg-[var(--brand-primary)] py-16 text-[var(--brand-primary-foreground)]">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready to grow your {vertical.name.toLowerCase()} business?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Join teams using {config.brand.name} with a {config.pricing.trial_days}-day free trial — no credit card
            required.
          </p>
          <Link
            href={`${APP_URL}/signup?pack=${vertical.packId}`}
            className="mt-8 inline-flex rounded-lg bg-white px-8 py-3 text-base font-medium text-[var(--brand-primary)] transition hover:opacity-90"
          >
            Get started with {vertical.name}
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
