"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/auth-context";

export function useAdminPage() {
  const router = useRouter();
  const { client, admin, loading, logout } = useAdminAuth();

  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/login");
    }
  }, [loading, admin, router]);

  return { client, admin, loading, logout };
}
