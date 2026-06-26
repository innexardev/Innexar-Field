#!/usr/bin/env node
/**
 * Lists apps/web module pages missing useTranslations — run after i18n rollout.
 * Usage: node scripts/i18n-audit-modules.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const WEB_APP = join(import.meta.dirname, "../apps/web/app");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (e.name === "page.tsx") files.push(p);
  }
  return files;
}

const pages = await walk(WEB_APP);
const missing = [];

for (const file of pages) {
  const src = await readFile(file, "utf8");
  if (!src.includes("ModulePage") && !src.includes("MobileModulePage")) continue;
  if (!src.includes("useTranslations")) {
    missing.push(file.replace(WEB_APP + "/", "app/"));
  }
}

if (missing.length === 0) {
  console.log("All module pages use useTranslations.");
} else {
  console.log(`${missing.length} module page(s) without useTranslations:`);
  for (const p of missing.sort()) console.log(`  ${p}`);
  process.exitCode = 1;
}
