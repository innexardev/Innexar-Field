"use client";

import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { HelpShell } from "@/components/help/help-shell";
import { ManualArticle } from "@/components/help/manual-article";
import { getManualArticle, type ManualSlug } from "@/content/help";

export default function HelpManualSlugPage() {
  const params = useParams<{ slug: string }>();
  const t = useTranslations("help.manual");
  const article = getManualArticle(params.slug);

  if (!article) {
    notFound();
  }

  const slug = params.slug as ManualSlug;

  return (
    <HelpShell title={t(`articles.${slug}.title`)} subtitle={t(`articles.${slug}.summary`)}>
      <ManualArticle slug={slug} />
    </HelpShell>
  );
}
