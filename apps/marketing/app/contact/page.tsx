import type { Metadata } from "next";
import Link from "next/link";
import { loadConfig } from "@fieldforge/config";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { ContactForm } from "../components/contact-form";
import { pageMetadata } from "../lib/metadata";
import { APP_URL } from "../lib/constants";

const config = loadConfig();

export const metadata: Metadata = pageMetadata(
  "Contact",
  `Get in touch with ${config.brand.name}. Request a demo, ask about enterprise pricing, or reach our support team.`,
  { path: "/contact" },
);

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Get in touch"
        subtitle="Request a demo, ask about pricing, or reach our team — we typically respond within one business day."
      />

      <section className="pb-20 pt-0">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
              <ContactForm />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="space-y-8">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
                  Sales
                </h2>
                <a
                  href={`mailto:${config.contact.sales_email}`}
                  className="mt-2 block text-lg font-medium text-[var(--brand-accent)] transition hover:underline"
                >
                  {config.contact.sales_email}
                </a>
                <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                  Demos, enterprise pricing, and partnership inquiries.
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
                  Support
                </h2>
                <a
                  href={`mailto:${config.contact.support_email}`}
                  className="mt-2 block text-lg font-medium text-[var(--brand-accent)] transition hover:underline"
                >
                  {config.contact.support_email}
                </a>
                <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                  Help with your account, billing, or technical questions.
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
                  Phone
                </h2>
                <a
                  href={`tel:${config.contact.phone.replace(/\D/g, "")}`}
                  className="mt-2 block text-lg font-medium text-[var(--brand-text-primary)]"
                >
                  {config.contact.phone}
                </a>
                <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                  Monday through Friday, 9 AM to 6 PM Eastern.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] p-6">
                <p className="text-sm font-medium text-[var(--brand-text-primary)]">Already a customer?</p>
                <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
                  Sign in to your account for faster support through the in-app help center.
                </p>
                <Link
                  href={`${APP_URL}/login`}
                  className="mt-4 inline-flex text-sm font-medium text-[var(--brand-accent)] transition hover:underline"
                >
                  Sign in to app
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
