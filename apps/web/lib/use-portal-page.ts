"use client";

import { usePathname, useRouter } from "next/navigation";
import { useBrand } from "@/components/brand-provider";
import { usePortalAuth } from "@/lib/portal-auth-context";

/** Shared props for authenticated portal customer pages. Auth guard lives in layout. */
export function usePortalPage() {
  const brand = useBrand();
  const { token, customer, client, logout } = usePortalAuth();
  const router = useRouter();
  const pathname = usePathname();

  return {
    brand,
    customer,
    token,
    client,
    pathname,
    onLogout: () => {
      logout();
      router.push("/portal/login");
    },
  };
}
