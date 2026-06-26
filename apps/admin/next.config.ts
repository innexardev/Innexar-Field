import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@fieldforge/config", "@fieldforge/i18n", "@fieldforge/sdk", "@fieldforge/ui"],
  async redirects() {
    return [
      { source: "/dashboard", destination: "/admin/dashboard", permanent: false },
      { source: "/tenants", destination: "/admin/tenants", permanent: false },
      { source: "/tenants/:id", destination: "/admin/tenants/:id", permanent: false },
      { source: "/plans", destination: "/admin/plans", permanent: false },
      { source: "/users", destination: "/admin/users", permanent: false },
      { source: "/billing", destination: "/admin/billing", permanent: false },
      { source: "/integrations", destination: "/admin/integrations", permanent: false },
      { source: "/config", destination: "/admin/integrations", permanent: false },
      { source: "/promotions", destination: "/admin/plans", permanent: false },
      { source: "/landing", destination: "/admin/dashboard", permanent: false },
    ];
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
