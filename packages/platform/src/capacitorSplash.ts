/** SplashScreen plugin shape consumed by apps/web/capacitor.config.ts. */
export type SplashScreenPluginConfig = {
  launchShowDuration: number;
  backgroundColor: string;
  showSpinner: boolean;
};

/** Defaults aligned with config/app.config.yaml mobile.capacitor.splash. */
export const DEFAULT_SPLASH_SCREEN_CONFIG: SplashScreenPluginConfig = {
  launchShowDuration: 2000,
  backgroundColor: "#0F172A",
  showSpinner: false,
};
