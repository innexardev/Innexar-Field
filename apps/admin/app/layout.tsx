import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { loadConfig, brandCssVars, brandMetadataIcons } from "@fieldforge/config";
import { AdminAuthProvider } from "@/lib/auth-context";
import "./globals.css";

const config = loadConfig();

export const metadata: Metadata = {
  title: `Platform Admin — ${config.brand.name}`,
  description: "Innexar Field platform operations console",
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
    <html lang={locale} className="dark">
      <body
        style={{ fontFamily: config.brand.typography.font_sans }}
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased"
      >
        <style dangerouslySetInnerHTML={{ __html: `:root { ${style} }` }} />
        <NextIntlClientProvider messages={messages}>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
