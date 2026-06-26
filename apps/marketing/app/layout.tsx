import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { loadConfig, brandCssVars, brandMetadataIcons } from "@fieldforge/config";
import { AttributionCapture } from "./components/attribution-capture";
import "./globals.css";

const config = loadConfig();

export const metadata: Metadata = {
  title: `${config.brand.name} — ${config.brand.tagline}`,
  description: config.brand.description,
  icons: brandMetadataIcons(config.brand),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const vars = brandCssVars(config.brand.colors);
  const style = Object.entries(vars)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");

  return (
    <html lang={locale} className="scroll-smooth">
      <body style={{ fontFamily: config.brand.typography.font_sans }} className="antialiased">
        <style dangerouslySetInnerHTML={{ __html: `:root { ${style} }` }} />
        <NextIntlClientProvider messages={messages}>
          <AttributionCapture />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
