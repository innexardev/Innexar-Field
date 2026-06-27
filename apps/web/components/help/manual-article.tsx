"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import type { ManualSlug } from "@/content/help";
import { getManualArticle } from "@/content/help";

export function ManualArticle({ slug }: { slug: ManualSlug }) {
  const t = useTranslations("help.manual");
  const article = getManualArticle(slug);
  if (!article) return null;

  const integrationSections =
    slug === "integrations" && "extraSections" in article ? article.extraSections : undefined;

  return (
    <div>
      <div className="mb-6">
        <Link href="/help/manual" className="text-sm text-[var(--brand-accent)] hover:underline">
          {t("backToIndex")}
        </Link>
      </div>

      <p className="mb-8 max-w-3xl text-sm leading-relaxed text-[var(--brand-text-secondary)]">
        {t(`articles.${slug}.intro`)}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{t(`articles.${slug}.title`)}</CardTitle>
          <p className="text-sm text-[var(--brand-text-secondary)]">{t(`articles.${slug}.summary`)}</p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-[var(--brand-text-secondary)]">
            {article.steps.map((stepKey, index) => (
              <li key={stepKey} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-xs font-semibold text-[var(--brand-accent)]">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{t(`articles.${slug}.steps.${stepKey}`)}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {integrationSections ? (
        <div className="mt-6 space-y-6">
          {integrationSections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{t(`articles.integrations.sections.${section.id}.title`)}</CardTitle>
                <p className="text-sm text-[var(--brand-text-secondary)]">
                  {t(`articles.integrations.sections.${section.id}.summary`)}
                </p>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-[var(--brand-text-secondary)]">
                  {section.steps.map((stepKey, index) => (
                    <li key={stepKey} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-xs font-semibold text-[var(--brand-accent)]">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 leading-relaxed">
                        {t(`articles.integrations.sections.${section.id}.steps.${stepKey}`)}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {slug === "integrations" ? (
        <div className="mt-6">
          <Link href="/settings/integrations" className="text-sm text-[var(--brand-accent)] hover:underline">
            {t("openIntegrations")}
          </Link>
        </div>
      ) : null}

      <p className="mt-8 text-xs text-[var(--brand-text-muted)]">{t(`articles.${slug}.footer`)}</p>
    </div>
  );
}
