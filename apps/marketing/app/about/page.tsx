import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeatureCard, Section } from "@fieldforge/ui";
import { IconShield, IconUsers, IconChart } from "@fieldforge/ui";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { APP_URL } from "../lib/constants";
import { getAboutPageContent } from "../lib/marketing-content";
import { pageMetadata } from "../lib/metadata";

const VALUE_ICONS = [IconUsers, IconChart, IconShield] as const;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getAboutPageContent();
  if (!content) {
    return pageMetadata("About", "Learn about Innexar Field.");
  }
  return pageMetadata("About", content.metaDescription);
}

export default async function AboutPage() {
  const content = await getAboutPageContent();
  if (!content) {
    notFound();
  }

  return (
    <MarketingShell>
      <PageHero title={content.hero.title} subtitle={content.hero.subtitle} />

      <section className="py-20 pt-0">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-lg leading-relaxed text-[var(--brand-text-secondary)]">{content.intro}</p>
          </div>
        </div>
      </section>

      <Section
        title={content.mission.title}
        subtitle={content.mission.subtitle}
        className="border-t border-[var(--brand-border)] bg-white"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-base leading-relaxed text-[var(--brand-text-secondary)]">{content.mission.body}</p>
        </div>
      </Section>

      <Section title="What we stand for">
        <div className="grid gap-6 md:grid-cols-3">
          {content.values.map((value, index) => {
            const Icon = VALUE_ICONS[index] ?? IconUsers;
            return (
              <FeatureCard
                key={value.title}
                icon={<Icon size={22} />}
                title={value.title}
                description={value.description}
                className="h-full"
              />
            );
          })}
        </div>
      </Section>

      <section className="border-t border-[var(--brand-border)] bg-[var(--brand-primary)] py-16 text-[var(--brand-primary-foreground)]">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">{content.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">{content.cta.subtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={`${APP_URL}/signup`}
              className="inline-flex rounded-lg bg-white px-8 py-3 text-base font-medium text-[var(--brand-primary)] transition hover:opacity-90"
            >
              Start free trial
            </Link>
            <Link
              href="/contact"
              className="inline-flex rounded-lg px-8 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
