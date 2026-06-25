#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

const broken = [];
const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;

for (const file of walk(docsDir)) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = linkRe.exec(content)) !== null) {
    const target = match[1];
    if (target.startsWith("http") || target.startsWith("#")) continue;
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      broken.push({ file: path.relative(root, file), target });
    }
  }
}

if (broken.length) {
  console.error("Broken markdown links:");
  for (const b of broken) console.error(`  ${b.file} → ${b.target}`);
  process.exit(1);
}

console.log("Markdown link validation passed.");
