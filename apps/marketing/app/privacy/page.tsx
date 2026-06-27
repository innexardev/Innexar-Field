import type { Metadata } from "next";
import { loadConfig } from "@fieldforge/config";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { pageMetadata } from "../lib/metadata";

const config = loadConfig();

export const metadata: Metadata = pageMetadata(
  "Privacy Policy",
  `Privacy Policy for ${config.brand.name} — how ${config.brand.legal_name} collects, uses, and protects your data.`,
  { path: "/privacy" },
);

export default function PrivacyPage() {
  const effectiveDate = "June 1, 2025";

  return (
    <MarketingShell>
      <PageHero title="Privacy Policy" subtitle={`Last updated: ${effectiveDate}`} />

      <article className="prose-legal mx-auto max-w-3xl px-6 pb-20">
        <p>
          {config.brand.legal_name} (&quot;{config.brand.name},&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) operates the {config.brand.name} platform and related services. This Privacy Policy
          describes how we collect, use, disclose, and safeguard your information when you visit our website or use
          our services.
        </p>

        <h2>Information we collect</h2>
        <p>
          We collect information you provide directly, such as name, email address, company name, billing
          information, and communications you send us. We also collect usage data, device information, and log data
          when you use our services.
        </p>

        <h2>How we use your information</h2>
        <p>
          We use collected information to provide and improve our services, process transactions, communicate with
          you, ensure security, comply with legal obligations, and analyze usage patterns to enhance the platform.
        </p>

        <h2>Data sharing</h2>
        <p>
          We do not sell your personal information. We may share data with service providers who assist in operating
          our platform (such as payment processors and cloud infrastructure providers), when required by law, or in
          connection with a business transfer.
        </p>

        <h2>California privacy rights (CCPA)</h2>
        <p>
          If you are a California resident, you have the right to know what personal information we collect, request
          deletion, opt out of the sale of personal information (we do not sell personal information), and not be
          discriminated against for exercising these rights. To submit a request, contact us at{" "}
          <a href={`mailto:${config.contact.support_email}`}>{config.contact.support_email}</a>.
        </p>

        <h2>Data security</h2>
        <p>
          We implement industry-standard security measures including encryption in transit, tenant isolation via
          PostgreSQL row-level security, and access controls. No method of transmission over the Internet is 100%
          secure.
        </p>

        <h2>Data retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide services, comply
          with legal obligations, resolve disputes, and enforce agreements.
        </p>

        <h2>Contact us</h2>
        <p>
          For privacy-related questions or requests, contact {config.brand.legal_name} at{" "}
          <a href={`mailto:${config.contact.support_email}`}>{config.contact.support_email}</a> or{" "}
          {config.contact.phone}.
        </p>
      </article>
    </MarketingShell>
  );
}
