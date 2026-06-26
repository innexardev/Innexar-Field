"use client";

import type { BrandConfig, PricingConfig } from "@fieldforge/config";
import { ConfigProvider } from "@/components/brand-provider";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionGuard } from "@/components/subscription-guard";

export function AppProviders({
  brand,
  pricing,
  children,
}: {
  brand: BrandConfig;
  pricing: PricingConfig;
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider brand={brand} pricing={pricing}>
      <AuthProvider>
        <SubscriptionGuard>{children}</SubscriptionGuard>
      </AuthProvider>
    </ConfigProvider>
  );
}
