"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

const PUBLIC_PREFIXES = ["/login", "/signup"];
const PAYMENT_PENDING_PREFIXES = ["/onboarding/billing", "/billing/success", "/billing/cancel"];
const DUNNING_PREFIXES = ["/billing/dunning", "/billing/success"];

function pathAllowed(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { token, client } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      setReady(true);
      return;
    }

    if (pathAllowed(pathname, PUBLIC_PREFIXES)) {
      setReady(true);
      return;
    }

    let cancelled = false;
    void client
      .getBillingStatus()
      .then((status) => {
        if (cancelled) return;

        if (status.requires_dunning && !pathAllowed(pathname, DUNNING_PREFIXES)) {
          router.replace("/billing/dunning");
          return;
        }

        if (status.requires_payment && !pathAllowed(pathname, PAYMENT_PENDING_PREFIXES)) {
          router.replace("/onboarding/billing");
          return;
        }

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [client, pathname, router, token]);

  if (!ready && token) return null;
  return children;
}
