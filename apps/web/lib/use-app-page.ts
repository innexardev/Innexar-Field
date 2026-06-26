"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBrand } from "@/components/brand-provider";
import { useAuth } from "@/lib/auth-context";

/** Shared auth guard + shell props for module pages. */
export function useAppPage() {
  const brand = useBrand();
  const { user, token, nav, client, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  return {
    brand,
    user,
    token,
    nav,
    client,
    pathname,
    onLogout: () => {
      logout();
      router.push("/login");
    },
  };
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
