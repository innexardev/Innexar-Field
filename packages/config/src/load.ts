import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";
import type { AppConfig } from "./types.js";

const CONFIG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../config",
);

function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  const baseRec = base as Record<string, unknown>;
  const overrideRec = override as Record<string, unknown>;

  for (const key of Object.keys(overrideRec)) {
    const val = overrideRec[key];
    const baseVal = baseRec[key];
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal, val as Record<string, unknown>);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as T;
}

function applyEnvOverrides(config: AppConfig): AppConfig {
  const result = structuredClone(config);

  if (process.env.FF_DEBUG_ENABLED !== undefined) {
    result.debug.enabled = process.env.FF_DEBUG_ENABLED === "true";
  }
  if (process.env.FF_DEBUG_LOG_LEVEL) {
    result.debug.log_level = process.env.FF_DEBUG_LOG_LEVEL as AppConfig["debug"]["log_level"];
  }
  if (process.env.FF_BRAND_NAME) {
    result.brand.name = process.env.FF_BRAND_NAME;
  }

  return result;
}

/**
 * Carrega config central: app.config.yaml + environments/{env}.yaml + env vars FF_*
 */
export function loadConfig(env = process.env.APP_ENV ?? "development"): AppConfig {
  const basePath = path.join(CONFIG_ROOT, "app.config.yaml");
  const envPath = path.join(CONFIG_ROOT, "environments", `${env}.yaml`);

  const base = yaml.parse(fs.readFileSync(basePath, "utf8")) as AppConfig;

  let merged = base;
  if (fs.existsSync(envPath)) {
    const envOverride = yaml.parse(fs.readFileSync(envPath, "utf8")) as Partial<AppConfig>;
    merged = deepMerge(base, envOverride);
  }

  merged.environment = env as AppConfig["environment"];
  return applyEnvOverrides(merged);
}

/** Singleton para runtime */
let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) cached = loadConfig();
  return cached;
}

export function reloadConfig(): AppConfig {
  cached = loadConfig();
  return cached;
}
