import Link from "next/link";
import { APP_URL } from "../lib/constants";
import { getMarketingBaseUrl } from "../lib/site-url";
import type { LandingPromo } from "../lib/landing-content";
import { resolveCtaHref } from "../lib/landing-content";

export function PromoBanner({ promo }: { promo: LandingPromo }) {
  const href = resolveCtaHref(promo.href, APP_URL, getMarketingBaseUrl());

  return (
    <div className="border-b border-[var(--brand-accent)]/20 bg-[var(--brand-accent)] text-[var(--brand-accent-foreground)]">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-6 py-2.5 text-center text-sm">
        <Link href={href} className="font-medium underline-offset-2 hover:underline">
          {promo.message}
        </Link>
      </div>
    </div>
  );
}
