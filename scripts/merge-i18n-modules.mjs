#!/usr/bin/env node
/** Merges navItems + modules from i18n-modules-data.mjs into packages/i18n/messages/*.json */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { navItems, modules } from "./i18n-modules-data.mjs";

const ROOT = join(import.meta.dirname, "..");
const MSG_DIR = join(ROOT, "packages/i18n/messages");

const localeMap = { en: "en.json", es: "es.json", "pt-BR": "pt-BR.json" };

for (const [locale, file] of Object.entries(localeMap)) {
  const path = join(MSG_DIR, file);
  const data = JSON.parse(await readFile(path, "utf8"));
  data.navItems = navItems[locale];
  data.modules = modules[locale];
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Updated ${file}`);
}
