"use client";

import type { BrandConfig, ContactConfig, PricingConfig } from "@fieldforge/config";
import { ConfigProvider } from "@/components/brand-provider";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionGuard } from "@/components/subscription-guard";

export function AppProviders({
  brand,
  pricing,
  contact,
  children,
}: {
  brand: BrandConfig;
  pricing: PricingConfig;
  contact: ContactConfig;
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider brand={brand} pricing={pricing} contact={contact}>
      <AuthProvider>
        <SubscriptionGuard>{children}</SubscriptionGuard>
      </AuthProvider>
    </ConfigProvider>
  );
}
