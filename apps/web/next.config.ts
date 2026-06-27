import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  staticPageGenerationTimeout: 600,
  transpilePackages: [
    "@fieldforge/config",
    "@fieldforge/i18n",
    "@fieldforge/platform",
    "@fieldforge/sdk",
    "@fieldforge/ui",
  ],
  productionBrowserSourceMaps: false,
  typescript: {
    // Validated separately via `npm run typecheck` at repo root.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/clients/:id/properties",
        destination: "/customers/:id/properties",
        permanent: true,
      },
      {
        source: "/clients/:id",
        destination: "/customers/:id",
        permanent: true,
      },
      {
        source: "/clients",
        destination: "/customers",
        permanent: true,
      },
      {
        source: "/cleaning/phases",
        destination: "/clean-phases",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
