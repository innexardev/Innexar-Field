"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { HelpShell } from "@/components/help/help-shell";
import { MANUAL_ARTICLES } from "@/content/help";

export default function HelpManualIndexPage() {
  const t = useTranslations("help.manual");

  return (
    <HelpShell title={t("title")} subtitle={t("subtitle")}>
      <div className="grid gap-4 sm:grid-cols-2">
        {MANUAL_ARTICLES.map((article, i) => (
          <Link key={article.slug} href={`/help/manual/${article.slug}`} className="block">
            <Card
              className="h-full transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))] stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardHeader>
                <CardTitle className="text-base">{t(`articles.${article.slug}.title`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--brand-text-secondary)]">{t(`articles.${article.slug}.summary`)}</p>
                <span className="mt-3 inline-block text-sm text-[var(--brand-accent)]">{t("readGuide")} →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </HelpShell>
  );
}
