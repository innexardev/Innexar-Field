import { loadConfig } from "@fieldforge/config";
import { JsonLd } from "./json-ld";
import { getMarketingBaseUrl } from "../lib/site-url";

export function GlobalSeoSchemas() {
  const config = loadConfig();
  const baseUrl = getMarketingBaseUrl();
  const starterPlan = config.pricing.plans.starter;

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.brand.legal_name,
    url: baseUrl,
    logo: `${baseUrl}${config.brand.logo.wordmark}`,
    email: config.contact.sales_email,
    telephone: config.contact.phone,
  };

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: config.brand.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: config.brand.description.trim(),
    url: baseUrl,
    offers: {
      "@type": "Offer",
      price: String(starterPlan.price_monthly ?? 0),
      priceCurrency: config.pricing.currency,
      url: `${baseUrl}/pricing`,
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.brand.name,
    url: baseUrl,
    description: config.brand.description.trim(),
    publisher: {
      "@type": "Organization",
      name: config.brand.legal_name,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/blog?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={[organization, softwareApplication, website]} />;
}
