"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BrandConfig, PricingConfig } from "@fieldforge/config";

interface PublicConfig {
  brand: BrandConfig;
  pricing: PricingConfig;
}

const ConfigContext = createContext<PublicConfig | null>(null);

export function ConfigProvider({
  brand,
  pricing,
  children,
}: {
  brand: BrandConfig;
  pricing: PricingConfig;
  children: ReactNode;
}) {
  return <ConfigContext.Provider value={{ brand, pricing }}>{children}</ConfigContext.Provider>;
}

export function useBrand() {
  return useConfig().brand;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig requires ConfigProvider");
  return ctx;
}
