import type { Config } from "tailwindcss";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default {
  content: [
    path.join(appRoot, "pages/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(appRoot, "components/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(appRoot, "app/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(appRoot, "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
