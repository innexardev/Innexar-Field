import type { Metadata } from "next";
import Link from "next/link";
import { loadConfig } from "@fieldforge/config";
import { PricingCard, Section } from "@fieldforge/ui";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { SignupLink } from "../components/signup-link";
import { pageMetadata } from "../lib/metadata";
import { APP_URL } from "../lib/constants";
import { getLandingContent } from "../lib/landing-content";

const config = loadConfig();

export const metadata: Metadata = pageMetadata(
  "Pricing",
  `Transparent SaaS pricing for ${config.brand.name}. Plans from $${config.pricing.plans.starter.price_monthly}/mo with a ${config.pricing.trial_days}-day free trial. No hidden fees.`,
  { path: "/pricing" },
);

const BILLING_FAQ = [
  {
    question: "Is there a free trial?",
    answer: `Yes. Every plan includes a ${config.pricing.trial_days}-day free trial with full access. No credit card required to start.`,
  },
  {
    question: "Can I switch plans later?",
    answer: "Absolutely. Upgrade or downgrade at any time. Changes take effect on your next billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards through Stripe. Enterprise customers can arrange invoicing.",
  },
  {
    question: "Are there annual discounts?",
    answer: "Yes. Annual billing saves approximately two months compared to monthly pricing on all paid plans.",
  },
  {
    question: "What happens when I cancel?",
    answer: "You retain access through the end of your billing period. Your data is exportable for 30 days after cancellation.",
  },
] as const;

export default async function PricingPage() {
  const landing = await getLandingContent();
  const { pricing } = landing;
  const addons = Object.values(config.pricing.addons);

  return (
    <MarketingShell>
      <PageHero
        title={pricing.title}
        subtitle={`USD/month billing · ${pricing.trialDays}-day free trial on all plans · Cancel anytime`}
      />

      <section className="py-20 pt-0">
        <div className="mx-auto max-w-6xl px-6">
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
                        className="block w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2.5 text-center text-sm font-medium text-[var(--brand-text-primary)] transition-all duration-300 hover:bg-[var(--brand-surface)]"
                      >
                        Contact sales
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
                        Choose {plan.name}
                      </SignupLink>
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section
        title="Add-ons"
        subtitle="Extend your plan as your team grows"
        className="border-t border-[var(--brand-border)] bg-white"
      >
        <div className="mx-auto grid max-w-3xl gap-4">
          {addons.map((addon) => (
            <div
              key={addon.name}
              className="flex items-center justify-between rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-6 py-4"
            >
              <span className="font-medium text-[var(--brand-text-primary)]">{addon.name}</span>
              <span className="text-sm text-[var(--brand-text-secondary)]">
                +${addon.price_monthly}/mo
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Billing FAQ" subtitle="Common questions about plans and payments">
        <div className="mx-auto max-w-3xl divide-y divide-[var(--brand-border)]">
          {BILLING_FAQ.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="cursor-pointer list-none text-lg font-medium text-[var(--brand-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--brand-text-secondary)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </Section>
    </MarketingShell>
  );
}
