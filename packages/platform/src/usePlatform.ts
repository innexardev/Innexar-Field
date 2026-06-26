"use client";

import { useCallback, useEffect, useState } from "react";

export type PlatformKind = "web" | "pwa" | "ios" | "android";

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    isPluginAvailable?: (name: string) => boolean;
  };
};

function getCapacitor(): CapacitorWindow["Capacitor"] | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as CapacitorWindow).Capacitor;
}

function detectPlatformKind(): PlatformKind {
  const cap = getCapacitor();
  if (cap?.isNativePlatform?.()) {
    const p = cap.getPlatform?.() ?? "web";
    if (p === "ios") return "ios";
    if (p === "android") return "android";
    return "web";
  }
  if (typeof window !== "undefined") {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return "pwa";
  }
  return "web";
}

function detectNative(): boolean {
  const cap = getCapacitor();
  return cap?.isNativePlatform?.() ?? false;
}

/** Platform adapter — web vs PWA vs Capacitor native shell. */
export function usePlatform() {
  const [isOnline, setIsOnline] = useState(true);
  const [platform, setPlatform] = useState<PlatformKind>("web");
  const [isNative, setIsNative] = useState(false);
  const [capacitorPlatform, setCapacitorPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    setPlatform(detectPlatformKind());
    setIsNative(detectNative());
    setCapacitorPlatform(getCapacitor()?.getPlatform?.() ?? null);

    const syncOnline = () => setIsOnline(navigator.onLine);
    const syncDisplay = () => setPlatform(detectPlatformKind());

    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", syncDisplay);

    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", syncDisplay);
    };
  }, []);

  const isPWA = platform === "pwa" || isNative;

  const hasCapacitorPlugin = useCallback((name: string) => {
    return getCapacitor()?.isPluginAvailable?.(name) ?? false;
  }, []);

  return {
    isNative,
    isOnline,
    isPWA,
    platform,
    capacitorPlatform,
    hasCapacitorPlugin,
  };
}
