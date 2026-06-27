"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";

/** True when the tenant has the plugin enabled (reflected in dynamic nav). */
export function usePluginEnabled(pluginId: string): boolean {
  const { nav } = useAuth();
  return useMemo(
    () => nav.some((item) => item.plugin_id === pluginId),
    [nav, pluginId],
  );
}
