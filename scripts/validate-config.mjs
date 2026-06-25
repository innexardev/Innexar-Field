#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "config/app.config.yaml");

const raw = fs.readFileSync(configPath, "utf8");
const config = yaml.parse(raw);

const errors = [];

if (!config.brand?.name) errors.push("brand.name is required");
if (!config.brand?.colors?.primary) errors.push("brand.colors.primary is required");
if (!config.pricing?.plans?.starter) errors.push("pricing.plans.starter is required");

const starter = config.pricing.plans.starter;
if (starter.price_monthly !== 25) {
  errors.push(`starter.price_monthly expected 25, got ${starter.price_monthly}`);
}

for (const env of ["development", "staging", "production"]) {
  const p = path.join(root, `config/environments/${env}.yaml`);
  if (!fs.existsSync(p)) errors.push(`missing environment file: ${env}.yaml`);
}

// production env file must disable debug
const prod = yaml.parse(fs.readFileSync(path.join(root, "config/environments/production.yaml"), "utf8"));
if (prod.debug?.enabled !== false) {
  errors.push("production.yaml must set debug.enabled: false");
}

if (errors.length) {
  console.error("Config validation failed:\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("Config validation passed.");
console.log(`  Brand: ${config.brand.name}`);
console.log(`  Starter: $${starter.price_monthly}/mo`);
console.log(`  Plans: ${Object.keys(config.pricing.plans).join(", ")}`);
