"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding/industry");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-accent)]"
        role="status"
        aria-label="Loading onboarding"
      />
    </div>
  );
}
