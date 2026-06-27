import Link from "next/link";
import { loadConfig } from "@fieldforge/config";
import { BrandLogo } from "@fieldforge/ui";
import { APP_URL } from "../lib/constants";
import { INDUSTRY_VERTICALS } from "../lib/industries";
import { SOLUTION_PAGES } from "../lib/solutions";
import { SignupLink } from "./signup-link";

export function SiteFooter() {
  const config = loadConfig();

  return (
    <footer className="border-t border-[var(--brand-border)] bg-[var(--brand-background-subtle)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <BrandLogo
              src={config.brand.logo.wordmark}
              alt={config.brand.name}
              height={32}
            />
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{config.brand.tagline}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--brand-text-secondary)]">
              <li>
                <Link href="/features" className="transition hover:text-[var(--brand-accent)]">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="transition hover:text-[var(--brand-accent)]">
                  Solutions
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="transition hover:text-[var(--brand-accent)]">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/blog" className="transition hover:text-[var(--brand-accent)]">
                  Blog
                </Link>
              </li>
              <li>
                <SignupLink href={`${APP_URL}/signup`} className="transition hover:text-[var(--brand-accent)]">
                  Free trial
                </SignupLink>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Solutions</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--brand-text-secondary)]">
              {SOLUTION_PAGES.map((solution) => (
                <li key={solution.slug}>
                  <Link
                    href={`/solutions/${solution.slug}`}
                    className="transition hover:text-[var(--brand-accent)]"
                  >
                    {solution.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Industries</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--brand-text-secondary)]">
              {INDUSTRY_VERTICALS.map((vertical) => (
                <li key={vertical.slug}>
                  <Link href={`/industries/${vertical.slug}`} className="transition hover:text-[var(--brand-accent)]">
                    {vertical.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--brand-text-secondary)]">
              <li>
                <Link href="/about" className="transition hover:text-[var(--brand-accent)]">
                  About
                </Link>
              </li>
              <li>
                <Link href="/security" className="transition hover:text-[var(--brand-accent)]">
                  Security
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="transition hover:text-[var(--brand-accent)]">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/referral" className="transition hover:text-[var(--brand-accent)]">
                  Referral program
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-[var(--brand-accent)]">
                  Contact
                </Link>
              </li>
              <li>
                <a href={`mailto:${config.contact.support_email}`} className="transition hover:text-[var(--brand-accent)]">
                  {config.contact.support_email}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[var(--brand-border)] pt-6 text-sm text-[var(--brand-text-muted)] sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {config.brand.legal_name}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition hover:text-[var(--brand-accent)]">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-[var(--brand-accent)]">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
