import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "../components/marketing-shell";
import { PageHero } from "../components/page-hero";
import { ProseSections } from "../components/prose-sections";
import { getSecurityPageContent } from "../lib/marketing-content";
import { pageMetadata } from "../lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSecurityPageContent();
  if (!content) {
    return pageMetadata("Security", "Security practices for Innexar Field.");
  }
  return pageMetadata("Security", content.metaDescription);
}

export default async function SecurityPage() {
  const content = await getSecurityPageContent();
  if (!content) {
    notFound();
  }

  return (
    <MarketingShell>
      <PageHero title={content.hero.title} subtitle={content.hero.subtitle} />
      <ProseSections sections={content.sections} />
    </MarketingShell>
  );
}
