import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { loadConfig } from "@fieldforge/config";
import {
  Badge,
  Card,
  CardContent,
  FeatureCard,
  PricingCard,
  Section,
  NavIcon,
} from "@fieldforge/ui";
import { MarketingShell } from "./components/marketing-shell";
import { SignupLink } from "./components/signup-link";
import { INDUSTRY_VERTICALS } from "./lib/industries";
import { APP_URL } from "./lib/constants";
import { getLandingContent, resolveCtaHref } from "./lib/landing-content";
import { getMarketingBaseUrl } from "./lib/site-url";

export default async function HomePage() {
  const config = loadConfig();
  const landing = await getLandingContent();
  const { hero, features, pricing } = landing;
  const marketingUrl = getMarketingBaseUrl();
  const t = await getTranslations("marketing");

  return (
    <MarketingShell>
      <section className="hero-mesh">
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center md:pb-32 md:pt-28">
          <div className="badge-pulse fade-in inline-block rounded-full">
            <Badge tone="success">{hero.badge}</Badge>
          </div>
          <h1 className="fade-in-delay-1 mt-8 text-4xl font-bold leading-tight tracking-tight text-[var(--brand-primary)] md:text-6xl md:leading-[1.1]">
            {hero.headline}
          </h1>
          <p className="fade-in-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--brand-text-secondary)] md:text-xl">
            {hero.subheadline}
          </p>
          <div className="fade-in-delay-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={resolveCtaHref(hero.ctaPrimary.href, APP_URL, marketingUrl)}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-8 py-3 text-base font-medium text-[var(--brand-accent-foreground)] shadow-lg transition-all duration-300 hover:opacity-90"
            >
              {hero.ctaPrimary.label}
            </Link>
            <Link
              href={resolveCtaHref(hero.ctaSecondary.href, APP_URL, marketingUrl)}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-8 py-3 text-base font-medium text-[var(--brand-text-primary)] transition-all duration-300 hover:bg-[var(--brand-surface)]"
            >
              {hero.ctaSecondary.label}
            </Link>
          </div>
          <p className="fade-in-delay-4 mt-6 text-sm text-[var(--brand-text-muted)]">{hero.footnote}</p>
        </div>
      </section>

      <section className="social-proof py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="social-proof-stat fade-in-view">
              <div className="social-proof-stat-value">3</div>
              <div className="social-proof-stat-label">{t("industryPacks")}</div>
            </div>
            <div className="social-proof-stat fade-in-view">
              <div className="social-proof-stat-value">{pricing.trialDays} days</div>
              <div className="social-proof-stat-label">{t("freeTrialNoCard")}</div>
            </div>
            <div className="social-proof-stat fade-in-view">
              <div className="social-proof-stat-value">RLS</div>
              <div className="social-proof-stat-label">{t("tenantIsolation")}</div>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <span className="trust-badge">
              <NavIcon name="shield" size={14} className="text-[var(--brand-accent)]" />
              PostgreSQL RLS
            </span>
            <span className="trust-badge">
              <NavIcon name="credit-card" size={14} className="text-[var(--brand-accent)]" />
              Stripe payments
            </span>
            <span className="trust-badge">
              <NavIcon name="calendar" size={14} className="text-[var(--brand-accent)]" />
              Mobile PWA
            </span>
            <span className="trust-badge">
              <NavIcon name="calculator" size={14} className="text-[var(--brand-accent)]" />
              Real-time job costing
            </span>
          </div>
        </div>
      </section>

      <Section
        id="features"
        title={features.title}
        subtitle={features.subtitle}
        className="border-y border-[var(--brand-border)] bg-white"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.items.map((feature, i) => (
            <div key={feature.title} className={`fade-in-view fade-in-delay-${Math.min((i % 4) + 1, 4)}`}>
              <FeatureCard
                icon={<NavIcon name={feature.icon} size={22} />}
                title={feature.title}
                description={feature.description}
                className="h-full"
              />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/features" className="text-sm font-medium text-[var(--brand-accent)] transition hover:underline">
            {t("viewAllFeatures")}
          </Link>
        </div>
      </Section>

      <Section id="industries" title={t("builtForIndustry")} subtitle={t("builtForIndustrySubtitle")}>
        <div className="grid gap-6 md:grid-cols-3">
          {INDUSTRY_VERTICALS.map((industry) => (
            <Card key={industry.slug} className={`industry-card fade-in-view ${industry.accent} h-full overflow-hidden`}>
              <CardContent className="flex h-full flex-col py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]">
                  <industry.Icon size={24} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--brand-text-primary)]">{industry.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--brand-text-secondary)]">{industry.description}</p>
                <Link href={`/industries/${industry.slug}`} className="mt-6 text-sm font-medium text-[var(--brand-accent)] transition hover:underline">
                  {t("learnMore")}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="pricing"
        title={pricing.title}
        subtitle={pricing.subtitle}
        className="border-t border-[var(--brand-border)] bg-white"
      >
        <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {pricing.plans.map((plan) => (
            <div key={plan.id} className={`flex h-full ${plan.featured ? "relative z-10 lg:-translate-y-4" : ""}`}>
              <PricingCard
                name={plan.name}
                badge={plan.badge ?? undefined}
                price={plan.priceMonthly != null ? `$${plan.priceMonthly}` : <span>From ${plan.priceFrom}</span>}
                description={plan.description}
                features={plan.features}
                featured={plan.featured}
                className="h-full w-full"
                cta={
                  plan.enterprise ? (
                    <Link
                      href="/contact"
                      className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-all duration-300 ${
                        plan.featured
                          ? "bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] hover:opacity-90"
                          : "border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-[var(--brand-text-primary)] hover:bg-[var(--brand-surface)]"
                      }`}
                    >
                      {t("contactSales")}
                    </Link>
                  ) : (
                    <SignupLink
                      href={`${APP_URL}/signup?plan=${plan.id}`}
                      className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-all duration-300 ${
                        plan.featured
                          ? "bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)] hover:opacity-90"
                          : "border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-[var(--brand-text-primary)] hover:bg-[var(--brand-surface)]"
                      }`}
                    >
                      {`Choose ${plan.name}`}
                    </SignupLink>
                  )
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/pricing" className="text-sm font-medium text-[var(--brand-accent)] transition hover:underline">
            {t("comparePlans")}
          </Link>
        </div>
      </Section>

      <section className="bg-[var(--brand-primary)] py-16 text-[var(--brand-primary-foreground)]">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            {t("ctaSubtitle", { brand: config.brand.name })}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <SignupLink href={`${APP_URL}/signup`} className="inline-flex rounded-lg bg-white px-8 py-3 text-base font-medium text-[var(--brand-primary)] transition hover:opacity-90">
              {t("ctaTrial", { days: pricing.trialDays })}
            </SignupLink>
            <Link href="/contact" className="inline-flex rounded-lg px-8 py-3 text-base font-medium text-white transition hover:bg-white/10">
              {t("talkToSales")}
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
