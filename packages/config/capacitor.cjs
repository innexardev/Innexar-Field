/**
 * CommonJS entry for Capacitor CLI (cannot load ESM .ts exports).
 * Reads the same config/app.config.yaml as loadConfig().
 */
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");

const CONFIG_ROOT = path.resolve(__dirname, "../../config");
const base = yaml.parse(fs.readFileSync(path.join(CONFIG_ROOT, "app.config.yaml"), "utf8"));

function brandAppId(appDomain) {
  return appDomain.split(".").filter(Boolean).reverse().join(".");
}

function brandUrlScheme(brandName) {
  return brandName.replace(/[^a-zA-Z0-9]/g, "");
}

function splashScreenPlugin(mobile) {
  const splash = mobile?.capacitor?.splash ?? {};
  return {
    launchShowDuration: splash.launch_show_duration_ms ?? 2000,
    backgroundColor: splash.background_color ?? base.brand?.colors?.primary ?? "#0F172A",
    showSpinner: splash.show_spinner ?? false,
  };
}

function deepLinkConfig(mobile) {
  const links = mobile?.capacitor?.deep_links ?? {};
  return {
    pathPrefix: links.path_prefix ?? "/m",
    jobsPath: links.jobs_path ?? "/m/jobs",
  };
}

module.exports = {
  brand: base.brand,
  mobile: base.mobile ?? {},
  brandAppId,
  brandUrlScheme,
  splashScreenPlugin,
  deepLinkConfig,
};
