import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const configPath = path.join(root, "config/app.config.yaml");
const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/manifest.json");

const config = yaml.parse(fs.readFileSync(configPath, "utf8"));

function iconType(src) {
  return src.endsWith(".svg") ? "image/svg+xml" : "image/png";
}

const manifest = {
  name: config.brand.name,
  short_name: config.brand.short_name,
  description: config.brand.tagline,
  start_url: "/m",
  display: "standalone",
  background_color: config.brand.colors.background,
  theme_color: config.brand.colors.primary,
  orientation: "portrait",
  icons: [
    {
      src: config.brand.logo.favicon,
      sizes: "any",
      type: iconType(config.brand.logo.favicon),
      purpose: "any",
    },
    {
      src: config.brand.logo.icon,
      sizes: "512x512",
      type: iconType(config.brand.logo.icon),
      purpose: "any",
    },
    {
      src: "/brand/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/brand/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
      purpose: "any",
    },
  ],
};

fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
