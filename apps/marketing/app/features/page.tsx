import type { Metadata } from "next";
import Link from "next/link";
import { loadConfig } from "@fieldforge/config";
import { FeatureCard, Section } from "@fieldforge/ui";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { pageMetadata } from "../lib/metadata";
import { MODULE_GROUPS } from "../lib/modules";
import { APP_URL } from "../lib/constants";

const config = loadConfig();

export const metadata: Metadata = pageMetadata(
  "Features",
  `Explore every module in ${config.brand.name} — CRM, estimating, dispatch, job costing, invoicing, and industry packs for cleaning, construction, and field services.`,
);

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Every module your field business needs"
        subtitle="From first lead to final invoice — one platform with purpose-built tools for US contractors."
      >
        <Link
          href={`${APP_URL}/signup`}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] shadow-lg transition-all duration-300 hover:opacity-90"
        >
          Start your {config.pricing.trial_days}-day free trial
        </Link>
      </PageHero>

      {MODULE_GROUPS.map((group) => (
        <Section
          key={group.name}
          title={group.name}
          subtitle={group.description}
          className="border-t border-[var(--brand-border)] bg-white first:border-t-0"
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {group.modules.map((mod) => (
              <FeatureCard
                key={mod.title}
                icon={<mod.Icon size={22} />}
                title={mod.title}
                description={mod.description}
                className="h-full"
              />
            ))}
          </div>
        </Section>
      ))}

      <section className="bg-[var(--brand-primary)] py-16 text-[var(--brand-primary-foreground)]">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">See it in action</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Start your free trial and pick the industry pack that fits your business.
          </p>
          <Link
            href={`${APP_URL}/signup`}
            className="mt-8 inline-flex rounded-lg bg-white px-8 py-3 text-base font-medium text-[var(--brand-primary)] transition hover:opacity-90"
          >
            Get started free
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
