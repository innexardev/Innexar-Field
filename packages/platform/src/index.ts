export {
  parseDeepLink,
  parseJobDeepLink,
  parseJobIdFromPath,
  buildJobDeepLink,
  matchDeepLinkPath,
  isJobsDeepLink,
  MOBILE_PATH_PREFIX,
  JOBS_DEEP_LINK_PATH,
  type DeepLinkConfig,
  type DeepLinkRoute,
} from "./deepLinks";
export { useDeepLink } from "./useDeepLink";
export { usePlatform, type PlatformKind } from "./usePlatform";
export {
  DEFAULT_SPLASH_SCREEN_CONFIG,
  type SplashScreenPluginConfig,
} from "./capacitorSplash";
export {
  SIGNUP_ATTRIBUTION_PARAMS,
  SIGNUP_ATTRIBUTION_STORAGE_KEY,
  appendSignupAttributionToUrl,
  captureSignupAttributionFromLocation,
  hasSignupAttribution,
  loadSignupAttribution,
  mergeSignupAttribution,
  parseSignupAttribution,
  persistSignupAttribution,
  type SignupAttribution,
  type SignupAttributionParam,
} from "./signupAttribution";
