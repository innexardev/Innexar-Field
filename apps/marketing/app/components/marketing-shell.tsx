import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { PromoBanner } from "./promo-banner";
import { getLandingContent } from "../lib/landing-content";

export async function MarketingShell({ children }: { children: ReactNode }) {
  const landing = await getLandingContent();

  return (
    <div className="min-h-screen bg-[var(--brand-background-subtle)] text-[var(--brand-text-primary)]">
      {landing.promo ? <PromoBanner promo={landing.promo} /> : null}
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
