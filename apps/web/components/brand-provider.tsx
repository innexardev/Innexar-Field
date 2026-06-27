"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BrandConfig, ContactConfig, PricingConfig } from "@fieldforge/config";

interface PublicConfig {
  brand: BrandConfig;
  pricing: PricingConfig;
  contact: ContactConfig;
}

const ConfigContext = createContext<PublicConfig | null>(null);

export function ConfigProvider({
  brand,
  pricing,
  contact,
  children,
}: {
  brand: BrandConfig;
  pricing: PricingConfig;
  contact: ContactConfig;
  children: ReactNode;
}) {
  return <ConfigContext.Provider value={{ brand, pricing, contact }}>{children}</ConfigContext.Provider>;
}

export function useBrand() {
  return useConfig().brand;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig requires ConfigProvider");
  return ctx;
}
