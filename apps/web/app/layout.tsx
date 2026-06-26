import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { loadConfig, brandCssVars, brandMetadataIcons } from "@fieldforge/config";
import { AppProviders } from "@/components/app-providers";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const config = loadConfig();
const cssVars = Object.entries(brandCssVars(config.brand.colors))
  .map(([k, v]) => `${k}: ${v}`)
  .join("; ");

export const metadata: Metadata = {
  title: config.brand.name,
  description: config.brand.tagline,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: config.brand.name,
  },
  icons: brandMetadataIcons(config.brand),
  manifest: "/manifest.json",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body style={{ fontFamily: config.brand.typography.font_sans }} className="antialiased">
        <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
        <NextIntlClientProvider messages={messages}>
          <AppProviders brand={config.brand} pricing={config.pricing}>
            <PwaRegister />
            {children}
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
