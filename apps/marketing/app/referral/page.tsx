import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { ProseSections } from "../components/prose-sections";
import { APP_URL } from "../lib/constants";
import { getReferralPageContent } from "../lib/marketing-content";
import { pageMetadata } from "../lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getReferralPageContent();
  if (!content) {
    return pageMetadata("Referral Program", "Refer contractors to Innexar Field.");
  }
  return pageMetadata("Referral Program", content.metaDescription);
}

export default async function ReferralPage() {
  const content = await getReferralPageContent();
  if (!content) {
    notFound();
  }

  const ctaHref = content.cta.fallbackHref ?? `${APP_URL}/settings/billing`;

  return (
    <MarketingShell>
      <PageHero title={content.hero.title} subtitle={content.hero.subtitle} />
      <ProseSections sections={content.sections} />

      <section className="mx-auto max-w-3xl px-6 pb-12">
        <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background-subtle)] p-6">
          <h2 className="text-lg font-semibold text-[var(--brand-primary)]">Rewards</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-[var(--brand-text-muted)]">You earn</dt>
              <dd className="mt-1 font-medium text-[var(--brand-text-secondary)]">{content.reward.referrerCredit}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--brand-text-muted)]">They earn</dt>
              <dd className="mt-1 font-medium text-[var(--brand-text-secondary)]">{content.reward.refereeCredit}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--brand-text-muted)]">Active period</dt>
              <dd className="mt-1 font-medium text-[var(--brand-text-secondary)]">
                {content.reward.activeDaysRequired} days
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-t border-[var(--brand-border)] bg-[var(--brand-primary)] py-16 text-[var(--brand-primary-foreground)]">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">{content.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">{content.cta.subtitle}</p>
          <div className="mt-8">
            <Link
              href={ctaHref}
              className="inline-flex rounded-lg bg-white px-8 py-3 text-base font-medium text-[var(--brand-primary)] transition hover:opacity-90"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
