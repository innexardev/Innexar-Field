export type { AppConfig, BrandConfig, BrandColors, ContactConfig, DebugConfig, IntegrationConfig, IntegrationConnectionStatus, PricingConfig, PricingPlan } from "./types.js";
export {
  brandAppId,
  brandCssVars,
  brandMetadataIcons,
  brandUrlScheme,
  getPlan,
  isDebugEnabled,
  isDebugFeature,
  isIntegrationMockMode,
} from "./types.js";
export { getConfig, loadConfig, reloadConfig } from "./load.js";
