"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, type ReactNode } from "react";
import {
  JOBS_DEEP_LINK_PATH,
  MOBILE_PATH_PREFIX,
  useDeepLink,
  type DeepLinkRoute,
} from "@fieldforge/platform";
import { useBrand } from "@/components/brand-provider";
import { BrandLogo } from "@fieldforge/ui";
import { SyncBadge } from "@/components/sync-badge";

const NAV = [
  { href: "/m", label: "Home" },
  { href: "/m/jobs", label: "Jobs" },
  { href: "/m/time", label: "Time" },
  { href: "/m/expenses", label: "Expenses" },
  { href: "/m/profile", label: "Profile" },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const brand = useBrand();
  const pathname = usePathname();
  const router = useRouter();
  const isDetail = /^\/m\/jobs\/[^/]+$/.test(pathname);

  const deepLinkConfig = useMemo(
    () => ({
      host: brand.domains.app,
      pathPrefix: MOBILE_PATH_PREFIX,
      jobsPath: JOBS_DEEP_LINK_PATH,
    }),
    [brand.domains.app],
  );

  const onDeepLink = useCallback(
    (route: DeepLinkRoute) => {
      if (route.jobId) {
        router.push(`/m/jobs/${route.jobId}`);
      }
    },
    [router],
  );

  useDeepLink(onDeepLink, deepLinkConfig);

  return (
    <div className="mobile-shell">
      <header className="mobile-shell__header">
        <div className="mobile-shell__header-row">
          {isDetail ? (
            <Link href="/m/jobs" className="mobile-shell__back" aria-label="Back to jobs">
              ←
            </Link>
          ) : (
            <BrandLogo
              src={brand.logo.wordmark}
              alt={brand.name}
              height={28}
              className="mobile-shell__brand-logo"
            />
          )}
          <SyncBadge />
        </div>
        {!isDetail && <p className="mobile-shell__tagline">{brand.tagline}</p>}
      </header>

      <main className="mobile-shell__main page-enter">{children}</main>

      <nav className="mobile-shell__nav" aria-label="Field navigation">
        {NAV.map((item) => {
          const active =
            item.href === "/m"
              ? pathname === "/m"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-shell__nav-item${active ? " mobile-shell__nav-item--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
