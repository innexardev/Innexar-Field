import type { Metadata, Viewport } from "next";
import { loadConfig } from "@fieldforge/config";
import { MobileShell } from "@/components/mobile-shell";
import { PwaRegister } from "@/components/pwa-register";

const config = loadConfig();

export const metadata: Metadata = {
  title: config.brand.name,
  description: config.brand.tagline,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: config.brand.short_name,
  },
};

export const viewport: Viewport = {
  themeColor: config.brand.colors.primary,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaRegister />
      <MobileShell>{children}</MobileShell>
    </>
  );
}
