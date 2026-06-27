"use client";

import { useTranslations } from "next-intl";
import { HelpShell } from "@/components/help/help-shell";
import { FaqAccordion } from "@/components/help/faq-accordion";

export default function HelpFaqPage() {
  const t = useTranslations("help.faq");

  return (
    <HelpShell title={t("title")} subtitle={t("subtitle")}>
      <FaqAccordion />
    </HelpShell>
  );
}
