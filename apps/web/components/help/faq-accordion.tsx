"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconChevronDown } from "@fieldforge/ui";
import { FAQ_CATEGORIES } from "@/content/help";

export function FaqAccordion() {
  const t = useTranslations("help.faq");
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {FAQ_CATEGORIES.map((category) => (
        <section key={category.id}>
          <h2 className="mb-4 text-lg font-semibold text-[var(--brand-text-primary)]">
            {t(`categories.${category.id}.title`)}
          </h2>
          <div className="space-y-3">
            {category.items.map((itemId) => {
              const key = `${category.id}.${itemId}`;
              const open = openKey === key;
              return (
                <div
                  key={key}
                  className="overflow-hidden rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-[var(--brand-text-primary)] transition hover:bg-[var(--brand-surface-elevated)]"
                    aria-expanded={open}
                    onClick={() => setOpenKey(open ? null : key)}
                  >
                    <span>{t(`categories.${category.id}.items.${itemId}.q`)}</span>
                    <IconChevronDown
                      size={18}
                      className={`shrink-0 text-[var(--brand-text-muted)] transition ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open ? (
                    <div className="border-t border-[var(--brand-border)] px-5 py-4 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
                      {t(`categories.${category.id}.items.${itemId}.a`)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
