import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor CLI loads this file via require(); use CJS bridge for @fieldforge/config.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { brand, brandAppId, brandUrlScheme, mobile, splashScreenPlugin } = require("@fieldforge/config/capacitor") as {
  brand: { name: string; domains: { app: string } };
  mobile: Record<string, unknown>;
  brandAppId: (appDomain: string) => string;
  brandUrlScheme: (brandName: string) => string;
  splashScreenPlugin: (mobileConfig: Record<string, unknown>) => Record<string, unknown>;
};

const config: CapacitorConfig = {
  appId: brandAppId(brand.domains.app),
  appName: brand.name,
  webDir: "out",
  server: {
    androidScheme: "https",
    ...(process.env.CAPACITOR_SERVER_URL
      ? { url: process.env.CAPACITOR_SERVER_URL, cleartext: false }
      : {}),
  },
  plugins: {
    SplashScreen: splashScreenPlugin(mobile),
    Camera: {
      ...(typeof mobile === "object" && mobile !== null && "capacitor" in mobile
        ? ((mobile as { capacitor?: { camera?: Record<string, unknown> } }).capacitor?.camera ?? {})
        : {}),
    },
    App: {},
  },
  ios: {
    scheme: brandUrlScheme(brand.name),
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
