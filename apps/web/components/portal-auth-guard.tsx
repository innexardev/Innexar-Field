"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { usePortalAuth } from "@/lib/portal-auth-context";

const CUSTOMER_PREFIXES = [
  "/portal/invoices",
  "/portal/payments",
  "/portal/documents",
  "/portal/profile",
];

function requiresPortalCustomerAuth(pathname: string) {
  return CUSTOMER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function PortalAuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = usePortalAuth();
  const requiresAuth = requiresPortalCustomerAuth(pathname);

  useEffect(() => {
    if (requiresAuth && !token) {
      router.replace("/portal/login");
    }
  }, [requiresAuth, token, router]);

  if (requiresAuth && !token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-accent)]"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}
