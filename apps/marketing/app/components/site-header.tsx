import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { loadConfig } from "@fieldforge/config";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { BrandLogo } from "@fieldforge/ui";
import { APP_URL } from "../lib/constants";
import { SignupLink } from "./signup-link";

const NAV_HREFS = [
  { href: "/features", key: "features" },
  { href: "/industries", key: "industries" },
  { href: "/pricing", key: "pricing" },
  { href: "/blog", key: "blog" },
] as const;

export async function SiteHeader() {
  const config = loadConfig();
  const t = await getTranslations("marketing");

  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="inline-flex items-center">
          <BrandLogo
            src={config.brand.logo.wordmark}
            alt={config.brand.name}
            height={36}
          />
        </Link>
        <nav className="hidden gap-8 text-sm font-medium text-[var(--brand-text-secondary)] md:flex">
          {NAV_HREFS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-[var(--brand-accent)]">
              {t(link.key)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="compact" />
          <Link
            href={`${APP_URL}/login`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-[var(--brand-text-secondary)] transition-all duration-300 hover:bg-[var(--brand-surface-elevated)]"
          >
            {t("signIn")}
          </Link>
          <SignupLink
            href={`${APP_URL}/signup`}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-medium text-[var(--brand-accent-foreground)] shadow-sm transition-all duration-300 hover:opacity-90"
          >
            {t("startFreeTrial")}
          </SignupLink>
        </div>
      </div>
    </header>
  );
}
