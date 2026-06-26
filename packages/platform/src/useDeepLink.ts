"use client";

import { useEffect } from "react";
import { parseDeepLink, type DeepLinkConfig, type DeepLinkRoute } from "./deepLinks";

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

type AppUrlOpenEvent = { url: string };

type AppPlugin = {
  addListener: (
    event: "appUrlOpen",
    handler: (event: AppUrlOpenEvent) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
  getLaunchUrl: () => Promise<{ url: string } | undefined>;
};

function getCapacitor(): CapacitorWindow["Capacitor"] | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as CapacitorWindow).Capacitor;
}

function handleDeepLinkUrl(url: string, config: DeepLinkConfig, handler: (route: DeepLinkRoute) => void): void {
  const route = parseDeepLink(url, config);
  if (route) handler(route);
}

/**
 * Subscribe to deep-link opens — Capacitor App `appUrlOpen` on native, popstate on web.
 */
export function useDeepLink(
  handler: (route: DeepLinkRoute) => void,
  config: DeepLinkConfig,
): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPopState = () => handleDeepLinkUrl(window.location.href, config, handler);
    window.addEventListener("popstate", onPopState);

    let removeNativeListener: (() => Promise<void>) | undefined;

    const attachCapacitor = async () => {
      if (!getCapacitor()?.isNativePlatform?.()) return;

      try {
        const { App } = (await import("@capacitor/app")) as { App: AppPlugin };
        const sub = await App.addListener("appUrlOpen", ({ url }) => {
          handleDeepLinkUrl(url, config, handler);
        });
        removeNativeListener = () => sub.remove();

        const launch = await App.getLaunchUrl();
        if (launch?.url) handleDeepLinkUrl(launch.url, config, handler);
      } catch {
        // @capacitor/app optional — PWA uses browser URLs only
      }
    };

    void attachCapacitor();

    return () => {
      window.removeEventListener("popstate", onPopState);
      void removeNativeListener?.();
    };
  }, [handler, config.host, config.pathPrefix, config.jobsPath]);
}
