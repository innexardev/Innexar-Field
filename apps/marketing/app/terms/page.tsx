import type { Metadata } from "next";
import { loadConfig } from "@fieldforge/config";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { pageMetadata } from "../lib/metadata";

const config = loadConfig();

export const metadata: Metadata = pageMetadata(
  "Terms of Service",
  `Terms of Service for ${config.brand.name} — the agreement between you and ${config.brand.legal_name} for use of our platform.`,
  { path: "/terms" },
);

export default function TermsPage() {
  const effectiveDate = "June 1, 2025";

  return (
    <MarketingShell>
      <PageHero title="Terms of Service" subtitle={`Last updated: ${effectiveDate}`} />

      <article className="prose-legal mx-auto max-w-3xl px-6 pb-20">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the {config.brand.name}{" "}
          platform and related services provided by {config.brand.legal_name} (&quot;{config.brand.name},&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account or using our services, you
          agree to these Terms.
        </p>

        <h2>Account registration</h2>
        <p>
          You must provide accurate information when creating an account and keep your credentials secure. You are
          responsible for all activity under your account. You must be at least 18 years old and authorized to bind
          your organization to these Terms.
        </p>

        <h2>Subscription and billing</h2>
        <p>
          Paid plans are billed monthly or annually in advance. Fees are non-refundable except as required by law or
          expressly stated in your order. We offer a {config.pricing.trial_days}-day free trial on eligible plans.
          You may cancel at any time; access continues through the end of your billing period.
        </p>

        <h2>Acceptable use</h2>
        <p>
          You agree not to misuse the platform, interfere with other users, attempt unauthorized access, reverse
          engineer the software, or use the service for unlawful purposes. We may suspend or terminate accounts that
          violate these Terms.
        </p>

        <h2>Your data</h2>
        <p>
          You retain ownership of data you submit to the platform. You grant us a limited license to host, process,
          and display your data solely to provide the services. Our use of personal information is described in our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>

        <h2>Service availability</h2>
        <p>
          We strive for high availability but do not guarantee uninterrupted access. Scheduled maintenance and factors
          outside our control may cause temporary disruptions. Enterprise customers may have separate SLA terms.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, {config.brand.legal_name} shall not be liable for indirect,
          incidental, special, consequential, or punitive damages. Our total liability for any claim arising from
          these Terms or the services shall not exceed the amounts paid by you in the twelve months preceding the
          claim.
        </p>

        <h2>Governing law</h2>
        <p>
          These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of
          law principles. Disputes shall be resolved in the courts located in Delaware.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms? Contact us at{" "}
          <a href={`mailto:${config.contact.support_email}`}>{config.contact.support_email}</a>.
        </p>
      </article>
    </MarketingShell>
  );
}
