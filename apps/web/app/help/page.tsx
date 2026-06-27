"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { HelpShell } from "@/components/help/help-shell";

const HUB_CARDS = [
  { href: "/help/faq", key: "faq", icon: "?" },
  { href: "/help/manual", key: "manual", icon: "📘" },
  { href: "/help/support", key: "support", icon: "✉" },
] as const;

export default function HelpHubPage() {
  const t = useTranslations("help.hub");

  return (
    <HelpShell title={t("title")} subtitle={t("subtitle")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HUB_CARDS.map((card, i) => (
          <Link key={card.href} href={card.href} className="block">
            <Card
              className="h-full transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))] stagger-item"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-info-subtle)] text-lg">
                    {card.icon}
                  </div>
                  <CardTitle className="text-base">{t(`cards.${card.key}.title`)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--brand-text-secondary)]">{t(`cards.${card.key}.description`)}</p>
                <span className="mt-3 inline-block text-sm text-[var(--brand-accent)]">{t("open")} →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">{t("quickStart.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--brand-text-secondary)]">{t("quickStart.body")}</p>
          <Link
            href="/help/manual/getting-started"
            className="mt-4 inline-block text-sm font-medium text-[var(--brand-accent)] hover:underline"
          >
            {t("quickStart.link")} →
          </Link>
        </CardContent>
      </Card>
    </HelpShell>
  );
}
