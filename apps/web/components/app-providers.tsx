"use client";

import type { BrandConfig, PricingConfig } from "@fieldforge/config";
import { ConfigProvider } from "@/components/brand-provider";
import { AuthProvider } from "@/lib/auth-context";

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
      <AuthProvider>{children}</AuthProvider>
    </ConfigProvider>
  );
}
